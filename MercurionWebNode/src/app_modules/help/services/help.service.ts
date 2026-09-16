import { Injectable, NotFoundException } from '@nestjs/common'
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
import { JsonValue } from 'src/models/json.types'
import { UserService } from 'src/app_modules/user/services/user.service'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { runInTransaction } from 'src/persistence/transaction-context'
import { formatHelpPublicId } from '../models/value-objects/help-public-id'
import { NotificationOutboxService } from 'src/app_modules/notification/services/outbox/notification-outbox.service'
import { HelpNotificationEventType } from 'src/app_modules/notification/models/enums/help-notification-event-type.enum'

@Injectable()
export class HelpService {

  private readonly REQUIRED_TICKET_FIELDS = ['id', 'publicId', 'status', 'lastMessageAt']
  private readonly REQUIRED_MESSAGE_FIELDS = ['id', 'publicId', 'createdAt', 'authorType']

  // campi transienti GraphQL (non esistono sul DB)
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

  async createTicket(input: {
    userId: UUID
    subject: string
    contentDelta: JsonValue
    contentHtml: string
  }, canViewUsers: boolean = false): Promise<Ticket> {

    const now = Date.now()

    const ticket = new Ticket()
    ticket.userId = input.userId
    ticket.subject = input.subject
    ticket.status = TicketStatus.Open
    this.stampTicket(ticket, now)

    let firstMsg: TicketMessage | null = null

    await runInTransaction(this.dataSource, async (_context, manager) => {
      await manager.save(ticket)

      const message = this.makeUserMessage({
        ticketId: ticket.id,
        userId: input.userId,
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

    if (canViewUsers) {
      await this.attachTicketUserFullNames([ticket])
    }

    const presentedTicket = this.presentTicket(ticket)

    if (!canViewUsers) {
      Object.entries(presentedTicket).forEach(([key]) => {
        if (['authorId', 'userId', 'messages', 'userFullName'].includes(key)) {
          ;(presentedTicket as unknown as Record<string, string | object | null | undefined>)[key] = undefined
        }
      })
    }

    return presentedTicket
  }


  async addUserMessage(input: {
    ticketId: UUID
    userId: UUID
    contentDelta: JsonValue
    contentHtml: string
  }): Promise<{ ok: boolean }> {

    let msg: TicketMessage

    await runInTransaction(this.dataSource, async (_context, manager) => {
      const now = Date.now()

      const ticket = await manager.findOne(Ticket, {
        where: { id: input.ticketId, userId: input.userId },
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
        userId: input.userId,
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

  async addSupportMessage(input: {
    ticketId: UUID
    contentDelta: JsonValue
    contentHtml: string
  }): Promise<{ ok: boolean }> {

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

  async closeTicket(ticketId: UUID): Promise<{ ok: boolean }> {
    const now = Date.now()

    const res = await this.ticketRepo.update(ticketId, {
      status: TicketStatus.Closed,
      updatedAt: String(now),
    })

    if (!res.affected) throw new NotFoundException('Ticket not found')
    return { ok: true }
  }

  async reopenTicket(ticketId: UUID) {
    const now = Date.now()

    const res = await this.ticketRepo.update(ticketId, {
      status: TicketStatus.Open,
      updatedAt: String(now),
    })

    if (!res.affected) throw new NotFoundException('Ticket not found')
    return { ok: true }
  }

  // -----------------------------
  // Public API (READ) — field aware
  // -----------------------------

  async listTickets(
    userId: UUID,
    options: IPaginationOptions,
    fieldsMap?: GraphQLFieldsMap,
    onlyOwner: boolean = true,
    canViewUsers: boolean = false
  ): Promise<Pagination<Ticket>> {

    const itemFieldsMap = fieldsMap?.items ?? {}
    const scalarFields = GraphQLUtils.getScalarFields(itemFieldsMap)

    const wantsUserFullName = scalarFields.includes('userFullName')

    const columns = this.buildColumns(
      scalarFields,
      this.REQUIRED_TICKET_FIELDS,
      canViewUsers,
      ['userId'],
      this.TICKET_NON_DB_FIELDS,
      wantsUserFullName && canViewUsers ? ['userId'] : []
    )

    let qb = this.ticketRepo.createQueryBuilder('t')
      .select(columns.map(col => `t.${col}`))
      .orderBy('t.last_message_at', 'DESC')

    if (onlyOwner) {
      qb = qb.andWhere('t.user_id = :userId', { userId })
    }

    if (fieldsMap?.items) {
      const joins = TypeOrmUtils.filterJoinsForEntity(fieldsMap.items, ['messages'])
      qb = TypeOrmUtils.addJoins(qb, 't', joins as GraphQLFieldsMap)
    }

    let page = await paginate<Ticket>(qb, options)

    if (canViewUsers && wantsUserFullName) {
      await this.attachTicketUserFullNames(page.items)
    }

    page = {
      ...page,
      items: page.items.map((i) => {
        return this.presentTicket(i)
      })
    }

    return page
  }

  async getTicketDetail(
    ticketId: UUID,
    userId: UUID,
    fieldsMap: GraphQLFieldsMap,
    onlyOwner: boolean = true,
    canViewUsers: boolean = false
  ): Promise<TicketDetailDTO> {

    const ticketFields = fieldsMap.ticket ?? {}
    const scalarFields = GraphQLUtils.getScalarFields(ticketFields)

    const wantsUserFullName = scalarFields.includes('userFullName')

    const ticketColumns = this.buildColumns(
      scalarFields,
      this.REQUIRED_TICKET_FIELDS,
      canViewUsers,
      ['userId'],
      this.TICKET_NON_DB_FIELDS,
      wantsUserFullName && canViewUsers ? ['userId'] : []
    )

    let qb = this.ticketRepo.createQueryBuilder('t')
      .select(ticketColumns.map(col => `t.${col}`))
      .where('t.id = :ticketId', { ticketId })

    if (onlyOwner) {
      qb = qb.andWhere('t.user_id = :userId', { userId })
    }

    const ticket = await qb.getOne()
    if (!ticket) throw applicationError(ApplicationErrorCode.TICKET_NOT_FOUND)

    if (canViewUsers && wantsUserFullName) {
      await this.attachTicketUserFullNames([ticket])
    }

    return {
      ticket: this.presentTicket(ticket),
      messages: undefined
    }
  }

  async listTicketMessages(
    ticketId: UUID,
    userId: UUID,
    options: IPaginationOptions,
    fieldsMap: GraphQLFieldsMap,
    onlyOwner: boolean = true,
    canViewUsers: boolean = false
  ): Promise<Pagination<TicketMessage>> {

    if (onlyOwner) {
      const owns = await this.ticketRepo.exists({
        where: { id: ticketId, userId }
      })
      if (!owns) {
        throw applicationError(ApplicationErrorCode.TICKET_NOT_FOUND)
      }
    }

    const itemFieldsMap = fieldsMap?.items ?? {}
    const scalarFields = GraphQLUtils.getScalarFields(itemFieldsMap)

    const wantsUserFullName = scalarFields.includes('userFullName')
    const wantsAuthorFullName = scalarFields.includes('authorFullName')

    const extraIds: string[] = []
    if (canViewUsers && wantsUserFullName) extraIds.push('userId')
    if (canViewUsers && wantsAuthorFullName) extraIds.push('authorId')

    const columns = this.buildColumns(
      scalarFields,
      this.REQUIRED_MESSAGE_FIELDS,
      canViewUsers,
      ['authorId', 'userId'],
      this.MESSAGE_NON_DB_FIELDS,
      extraIds
    )

    const qb = this.msgRepo.createQueryBuilder('m')
      .select(columns.map(col => `m.${col}`))
      .where('m.ticket_id = :ticketId', { ticketId })
      .orderBy('m.created_at', 'DESC')

    let page = await paginate<TicketMessage>(qb, options)

    if (canViewUsers && (wantsUserFullName || wantsAuthorFullName)) {
      await this.attachMessageFullNames(page.items, {
        user: wantsUserFullName,
        author: wantsAuthorFullName
      })
    }

    page = {
      ...page,
      items: page.items.map((m) => {
        return this.presentMessage(m)
      })
    }

    return page
  }

  existsUserTicketById(userId: UUID, ticketId: UUID): Promise<boolean> {
    return this.ticketRepo.exists({
      where: {
        id: ticketId,
        userId
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

  private async attachTicketUserFullNames(tickets: Ticket[]): Promise<void> {
    const ids: UUID[] = []

    for (const t of tickets) {
      if (t.userId) ids.push(t.userId)
    }

    if (!ids.length) return

    const map = await this.users.getUserFullNames(ids)

    for (const t of tickets) {
      if (!t.userId) continue
      t.userFullName = map.get(String(t.userId))
    }
  }

  private async attachMessageFullNames(
    messages: TicketMessage[],
    opts: { user: boolean; author: boolean }
  ): Promise<void> {
    const ids: UUID[] = []

    for (const m of messages) {
      if (opts.user && m.userId) ids.push(m.userId)
      if (opts.author && m.authorId) ids.push(m.authorId)
    }

    if (!ids.length) return

    const map = await this.users.getUserFullNames(ids)

    for (const m of messages) {
      if (opts.user && m.userId) {
        m.userFullName = map.get(String(m.userId))
      }
      if (opts.author && m.authorId) {
        m.authorFullName = map.get(String(m.authorId))
      }
    }
  }

  private stampTicket(ticket: Ticket, now: number): void {
    ; (ticket as unknown as Record<string, string | null | undefined>).createdAt ??= String(now)
    ticket.updatedAt = String(now)
    ticket.lastMessageAt = String(now)
  }

  private presentTicket(ticket: Ticket): Ticket {
    const presented = Object.assign(
      Object.create(Object.getPrototypeOf(ticket)),
      ticket,
      { publicId: formatHelpPublicId(ticket.publicId, 'Ticket') },
    ) as Ticket

    if (ticket.messages) {
      presented.messages = ticket.messages.map(message => this.presentMessage(message))
    }

    return presented
  }

  private presentMessage(message: TicketMessage): TicketMessage {
    return Object.assign(
      Object.create(Object.getPrototypeOf(message)),
      message,
      {
        publicId: formatHelpPublicId(message.publicId, 'Message'),
        contentDelta: JSON.stringify(message.contentDelta),
      },
    ) as TicketMessage
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
