import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'crypto'

import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate'
import { Ticket } from '../models/entities/ticket.entity'
import { TicketMessage } from '../models/entities/ticket-message.entity'
import { TicketStatus } from '../models/enums/ticket-status.enum'
import { AuthorType } from '../models/enums/author-type.enum'
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils'
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/utils/type-orm-utils/type-orm-utils'
import { TicketDetailDTO } from '../models/dto/ticket-detail.dto'
import { TicketMessageResponse, TicketResponse } from '../models/dto/help-response.dto'
import { presentMessage, presentTicket } from '../models/dto/help-presenters'
import { JsonValue } from 'src/models/json.types'
import { UserService } from 'src/app_modules/user/services/user.service'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { runInTransaction } from 'src/persistence/transaction-context'
import { NotificationOutboxService } from 'src/app_modules/notification/services/outbox/notification-outbox.service'
import { HelpNotificationEventType } from 'src/app_modules/notification/models/enums/help-notification-event-type.enum'
import {
  authorizeHelpOperation,
  type HelpActor,
  isSupportActor,
} from '../authorization/help-authorization.policy'

@Injectable()
export class HelpService {

  private readonly REQUIRED_TICKET_FIELDS = ['id', 'publicId', 'status', 'lastMessageAt']
  private readonly REQUIRED_MESSAGE_FIELDS = ['id', 'publicId', 'createdAt', 'authorType']

  private readonly TICKET_NON_DB_FIELDS = ['userFullName']
  private readonly MESSAGE_NON_DB_FIELDS = ['userFullName', 'authorFullName']

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private readonly msgRepo: Repository<TicketMessage>,
    private readonly users: UserService,
    private readonly outbox: NotificationOutboxService,
  ) { }

  // -----------------------------
  // Public API (WRITE)
  // -----------------------------

  async createTicket(actor: HelpActor, input: {
    subject: string
    contentDelta: JsonValue
    contentHtml: string
  }): Promise<TicketResponse> {
    authorizeHelpOperation(actor, 'create')
    if (isSupportActor(actor)) throw applicationError(ApplicationErrorCode.TICKET_HANDLING_FORBIDDEN)

    const now = Date.now()

    const ticket = new Ticket()
    ticket.userId = actor.userId
    ticket.subject = input.subject
    ticket.status = TicketStatus.Open
    this.stampTicket(ticket, now)

    let firstMsg: TicketMessage | null = null

    await runInTransaction(this.dataSource, async (_context, manager) => {
      await manager.save(ticket)

      const message = this.makeUserMessage({
        ticketId: ticket.id,
        userId: actor.userId,
        delta: input.contentDelta,
        html: input.contentHtml,
        now
      })
      firstMsg = message

      await manager.save(message)
      await this.outbox.append(manager, {
        aggregateId: ticket.id,
        eventType: HelpNotificationEventType.TicketOpenedSupport,
        payload: { ticketId: ticket.id, messageId: message.id },
        dedupeKey: `help:${ticket.id}:ticket-opened-support`
      })
      await this.outbox.append(manager, {
        aggregateId: ticket.id,
        eventType: HelpNotificationEventType.TicketOpenedUser,
        payload: { ticketId: ticket.id, messageId: message.id },
        dedupeKey: `help:${ticket.id}:ticket-opened-user`
      })
    })

    if (!firstMsg) {
      throw applicationError(ApplicationErrorCode.TICKET_INITIAL_MESSAGE_CREATE_FAILED)
    }

    const names = actor.canViewUsers
      ? await this.users.getUserFullNames([ticket.userId])
      : undefined
    return presentTicket(ticket, {
      canViewUsers: actor.canViewUsers,
      userFullName: names?.get(String(ticket.userId)),
    })
  }


  async addUserMessage(actor: HelpActor, input: {
    ticketId: UUID
    contentDelta: JsonValue
    contentHtml: string
  }): Promise<{ ok: boolean }> {
    authorizeHelpOperation(actor, 'add-message')
    if (isSupportActor(actor)) {
      throw applicationError(ApplicationErrorCode.TICKET_HANDLING_FORBIDDEN)
    }

    let msg: TicketMessage

    await runInTransaction(this.dataSource, async (_context, manager) => {
      const now = Date.now()

      const ticket = await manager.findOne(Ticket, {
        where: { id: input.ticketId, userId: actor.userId },
        lock: { mode: 'pessimistic_write' },
      })

      if (!ticket) {
        throw applicationError(ApplicationErrorCode.TICKET_NOT_FOUND)
      }

      if (ticket.status === TicketStatus.Closed) {
        throw applicationError(ApplicationErrorCode.TICKET_CLOSED_FOR_PUBLISHING)
      }

      msg = this.makeUserMessage({
        ticketId: ticket.id,
        userId: actor.userId,
        delta: input.contentDelta,
        html: input.contentHtml,
        now
      })

      this.stampTicket(ticket, now)

      ticket.status = TicketStatus.WaitingSupport

      await manager.save(TicketMessage, msg)
      await manager.save(Ticket, ticket)
      await this.outbox.append(manager, {
        aggregateId: ticket.id,
        eventType: HelpNotificationEventType.UserMessageAdded,
        payload: { ticketId: ticket.id, messageId: msg.id },
        dedupeKey: `help:${ticket.id}:message:${msg.id}:user`
      })
    })

    return { ok: true }
  }

  async addSupportMessage(actor: HelpActor, input: {
    ticketId: UUID
    contentDelta: JsonValue
    contentHtml: string
  }): Promise<{ ok: boolean }> {
    authorizeHelpOperation(actor, 'add-message')
    if (!isSupportActor(actor)) {
      throw applicationError(ApplicationErrorCode.TICKET_HANDLING_FORBIDDEN)
    }

    await runInTransaction(this.dataSource, async (_context, manager) => {

      const now = Date.now()

      const ticket = await manager.findOne(Ticket, {
        where: { id: input.ticketId },
        lock: { mode: 'pessimistic_write' }
      })


      if (!ticket) {
        throw applicationError(ApplicationErrorCode.TICKET_NOT_FOUND)
      }

      if (ticket.status === TicketStatus.Closed) {
        throw applicationError(ApplicationErrorCode.TICKET_CLOSED_FOR_PUBLISHING)
      }

      const msg = this.makeSupportMessage({
        ticketId: ticket.id,
        userId: ticket.userId,
        delta: input.contentDelta,
        html: input.contentHtml,
        now
      })

      this.stampTicket(ticket, now)
      ticket.status = TicketStatus.WaitingUser

      await manager.save(TicketMessage, msg)
      await manager.save(Ticket, ticket)
      await this.outbox.append(manager, {
        aggregateId: ticket.id,
        eventType: HelpNotificationEventType.SupportReplied,
        payload: { ticketId: ticket.id, userId: ticket.userId },
        dedupeKey: `help:${ticket.id}:message:${now}:support`
      })

    })

    return { ok: true }
  }

  async closeTicket(actor: HelpActor, ticketId: UUID): Promise<{ ok: boolean }> {
    authorizeHelpOperation(actor, 'close')
    return this.updateTicketStatus(actor, ticketId, TicketStatus.Closed)
  }

  async reopenTicket(actor: HelpActor, ticketId: UUID) {
    authorizeHelpOperation(actor, 'reopen')
    return this.updateTicketStatus(actor, ticketId, TicketStatus.Open)
  }

  // -----------------------------
  // Public API (READ) — field aware
  // -----------------------------

  async listTickets(
    actor: HelpActor,
    options: IPaginationOptions,
    fieldsMap?: GraphQLFieldsMap,
  ): Promise<Pagination<TicketResponse>> {
    authorizeHelpOperation(actor, 'list')

    const itemFieldsMap = fieldsMap?.items ?? {}
    const scalarFields = GraphQLUtils.getScalarFields(itemFieldsMap)

    const wantsUserFullName = scalarFields.includes('userFullName')

    const columns = this.buildColumns(
      scalarFields,
      this.REQUIRED_TICKET_FIELDS,
      actor.canViewUsers,
      ['userId'],
      this.TICKET_NON_DB_FIELDS,
      wantsUserFullName && actor.canViewUsers ? ['userId'] : []
    )

    let qb = this.ticketRepo.createQueryBuilder('t')
      .select(columns.map(col => `t.${col}`))
      .orderBy('t.last_message_at', 'DESC')
      .addOrderBy('t.id', 'ASC')

    if (!isSupportActor(actor)) {
      qb = qb.andWhere('t.user_id = :userId', { userId: actor.userId })
    }

    if (fieldsMap?.items) {
      const joins = TypeOrmUtils.filterJoinsForEntity(fieldsMap.items, ['messages'])
      qb = TypeOrmUtils.addJoins(qb, 't', joins as GraphQLFieldsMap)
    }

    const page = await paginate<Ticket>(qb, options)

    const names = actor.canViewUsers && wantsUserFullName
      ? await this.users.getUserFullNames(page.items.map((item) => item.userId))
      : undefined
    return {
      ...page,
      items: page.items.map((item) => presentTicket(item, {
        canViewUsers: actor.canViewUsers,
        userFullName: names?.get(String(item.userId)),
      })),
    }
  }

  async getTicketDetail(
    ticketId: UUID,
    actor: HelpActor,
    fieldsMap: GraphQLFieldsMap,
  ): Promise<TicketDetailDTO> {
    authorizeHelpOperation(actor, 'detail')

    const ticketFields = fieldsMap.ticket ?? {}
    const scalarFields = GraphQLUtils.getScalarFields(ticketFields)

    const wantsUserFullName = scalarFields.includes('userFullName')

    const ticketColumns = this.buildColumns(
      scalarFields,
      this.REQUIRED_TICKET_FIELDS,
      actor.canViewUsers,
      ['userId'],
      this.TICKET_NON_DB_FIELDS,
      wantsUserFullName && actor.canViewUsers ? ['userId'] : []
    )

    let qb = this.ticketRepo.createQueryBuilder('t')
      .select(ticketColumns.map(col => `t.${col}`))
      .where('t.id = :ticketId', { ticketId })

    if (!isSupportActor(actor)) {
      qb = qb.andWhere('t.user_id = :userId', { userId: actor.userId })
    }

    const ticket = await qb.getOne()
    if (!ticket) throw applicationError(ApplicationErrorCode.TICKET_NOT_FOUND)

    const names = actor.canViewUsers && wantsUserFullName
      ? await this.users.getUserFullNames([ticket.userId])
      : undefined

    return {
      ticket: presentTicket(ticket, {
        canViewUsers: actor.canViewUsers,
        userFullName: names?.get(String(ticket.userId)),
      }),
      messages: undefined
    }
  }

  async listTicketMessages(
    ticketId: UUID,
    actor: HelpActor,
    options: IPaginationOptions,
    fieldsMap: GraphQLFieldsMap,
  ): Promise<Pagination<TicketMessageResponse>> {
    authorizeHelpOperation(actor, 'messages')

    const itemFieldsMap = fieldsMap?.items ?? {}
    const scalarFields = GraphQLUtils.getScalarFields(itemFieldsMap)

    const wantsUserFullName = scalarFields.includes('userFullName')
    const wantsAuthorFullName = scalarFields.includes('authorFullName')

    const extraIds: string[] = []
    if (actor.canViewUsers && wantsUserFullName) extraIds.push('userId')
    if (actor.canViewUsers && wantsAuthorFullName) extraIds.push('authorId')

    const columns = this.buildColumns(
      scalarFields,
      this.REQUIRED_MESSAGE_FIELDS,
      actor.canViewUsers,
      ['authorId', 'userId'],
      this.MESSAGE_NON_DB_FIELDS,
      extraIds
    )

    let qb = this.msgRepo.createQueryBuilder('m')
      .select(columns.map(col => `m.${col}`))
      .where('m.ticket_id = :ticketId', { ticketId })
      .orderBy('m.created_at', 'DESC')
      .addOrderBy('m.id', 'ASC')

    if (!isSupportActor(actor)) {
      qb = qb.innerJoin(Ticket, 't', 't.id = m.ticket_id AND t.user_id = :userId', {
        userId: actor.userId,
      })
    }

    const page = await paginate<TicketMessage>(qb, options)

    const names = actor.canViewUsers && (wantsUserFullName || wantsAuthorFullName)
      ? await this.users.getUserFullNames(
        page.items.flatMap((item) => [item.userId, item.authorId].filter(Boolean) as UUID[]),
      )
      : undefined
    return {
      ...page,
      items: page.items.map((item) => presentMessage(item, {
        canViewUsers: actor.canViewUsers,
        authorFullNames: names,
      })),
    }
  }

  private async updateTicketStatus(
    actor: HelpActor,
    ticketId: UUID,
    status: TicketStatus,
  ): Promise<{ ok: boolean }> {
    return runInTransaction(this.dataSource, async (_context, manager) => {
      const now = Date.now()
      const qb = manager.createQueryBuilder()
        .update(Ticket)
        .set({ status, updatedAt: String(now) })
        .where('id = :ticketId', { ticketId })

      if (!isSupportActor(actor)) {
        qb.andWhere('user_id = :userId', { userId: actor.userId })
      }

      const result = await qb.execute()
      if (!result.affected) {
        throw applicationError(ApplicationErrorCode.TICKET_NOT_FOUND)
      }
      return { ok: true }
    })
  }

  existsUserTicketById(actor: HelpActor, ticketId: UUID): Promise<boolean> {
    authorizeHelpOperation(actor, 'detail')
    if (isSupportActor(actor)) return Promise.resolve(false)
    return this.ticketRepo.exists({
      where: {
        id: ticketId,
        userId: actor.userId
      }
    })
  }

  // -----------------------------
  // Private helpers
  // -----------------------------

  private buildColumns(
    scalarFields: string[],
    required: string[],
    canViewUsers: boolean,
    hiddenWhenNoUsers: string[],
    nonDbFields: string[],
    extraRequired: string[]
  ): string[] {
    // required + requested
    let cols = GraphQLUtils.ensureRequiredFields(scalarFields, required)

    // mai selezionare transienti
    cols = cols.filter(c => !nonDbFields.includes(c))

    // se servono fullName, forza gli id necessari
    if (extraRequired.length) {
      cols = GraphQLUtils.ensureRequiredFields(cols, extraRequired)
    }

    // permessi utenti
    if (!canViewUsers) {
      cols = cols.filter(c => !hiddenWhenNoUsers.includes(c))
    }

    return cols
  }

  private stampTicket(ticket: Ticket, now: number): void {
    ; (ticket as unknown as Record<string, string | null | undefined>).createdAt ??= String(now)
    ticket.updatedAt = String(now)
    ticket.lastMessageAt = String(now)
  }

  private makeUserMessage(input: {
    ticketId: UUID
    userId: UUID
    delta: JsonValue
    html: string
    now: number
  }): TicketMessage {
    const m = new TicketMessage()
    m.id = uuidv7() as UUID
    m.ticketId = input.ticketId
    m.userId = input.userId
    m.authorType = AuthorType.User
    m.authorId = input.userId
    m.contentDelta = input.delta
    m.contentHtml = input.html
    m.createdAt = String(input.now)
    return m
  }

  private makeSupportMessage(input: {
    ticketId: UUID
    userId: UUID
    delta: JsonValue
    html: string
    now: number
  }): TicketMessage {
    const m = new TicketMessage()
    m.id = uuidv7() as UUID
    m.ticketId = input.ticketId
    m.userId = input.userId
    m.authorType = AuthorType.Support
    m.authorId = null
    m.contentDelta = input.delta
    m.contentHtml = input.html
    m.createdAt = String(input.now)
    return m
  }
}
