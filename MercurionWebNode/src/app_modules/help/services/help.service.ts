import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { uuidv7 } from '@kripod/uuidv7'
import { randomBytes, UUID } from 'crypto'
import { Maybe } from 'graphql/jsutils/Maybe'
import { RpcException } from '@nestjs/microservices'
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate'
import { Ticket } from '../Models/entities/ticket.entity'
import { TicketMessage } from '../Models/entities/ticket-message.entity'
import { TicketStatus } from '../Models/enums/ticket-status.enum'
import { AuthorType } from '../Models/enums/author-type.enum'
import { MailSenderService } from 'src/app_modules/notification/services/mail-sender/mail-sender.service'
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils'
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/utils/type-orm-utils/type-orm-utils'
import { TicketDetailDTO } from '../Models/DTO/ticket-detail.dto'
import { JsonValue } from 'src/Models/json.types'
import { TypeGuards } from 'src/utils/type-guards/type-guards'

@Injectable()
export class HelpService {

  private readonly REQUIRED_TICKET_FIELDS = ['id', 'publicId', 'status', 'lastMessageAt']
  private readonly REQUIRED_MESSAGE_FIELDS = ['id', 'publicId', 'createdAt', 'authorType']

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private readonly msgRepo: Repository<TicketMessage>,
    private readonly mailer: MailSenderService,
  ) { }

  // -----------------------------
  // Public API (WRITE)
  // -----------------------------

  async createTicket(input: {
    userId: UUID
    subject: string
    contentDelta: JsonValue
    contentHtml: string
  }): Promise<Ticket> {

    const now = Date.now()

    const ticket = new Ticket()
    ticket.userId = input.userId
    ticket.subject = input.subject
    ticket.status = TicketStatus.Open
    this.stampTicket(ticket, now)

    let firstMsg: TicketMessage | null = null

    await this.dataSource.transaction(async (manager) => {

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
    })

    if (!firstMsg) throw new Error('Failed to create first ticket message')

    await this.mailer.notifySupportNewTicket(ticket, firstMsg)
    await this.mailer.confirmUserTicketOpened(ticket, firstMsg)

    ticket.publicId = this.generateReadablePublicId(ticket.publicId)
    return ticket
  }

  async addUserMessage(input: {
    ticketId: UUID
    userId: UUID
    contentDelta: JsonValue
    contentHtml: string
  }): Promise<{ ok: boolean }> {
    await this.dataSource.transaction(async (manager) => {
      const now = Date.now()

      const ticket = await manager.findOne(Ticket, {
        where: { id: input.ticketId, userId: input.userId },
        lock: { mode: 'pessimistic_write' },
      })

      if (!ticket) throw new RpcException('TicketNotFound')

      const msg = this.makeUserMessage({
        ticketId: ticket.id,
        userId: input.userId,
        delta: input.contentDelta,
        html: input.contentHtml,
        now
      })

      this.stampTicket(ticket, now)

      if (ticket.status === TicketStatus.Closed) {
        ticket.status = TicketStatus.Open
      } else {
        ticket.status = TicketStatus.WaitingSupport
      }

      await manager.save(TicketMessage, msg)
      await manager.save(Ticket, ticket)
    })

    const freshTicket = await this.ticketRepo.findOneByOrFail({ id: input.ticketId })
    await this.mailer.notifySupportNewMessage(freshTicket)

    return { ok: true }
  }

  async addSupportMessage(input: {
    ticketId: UUID
    contentDelta: JsonValue
    contentHtml: string
  }): Promise<{ ok: boolean }> {
    let ticketUserId: UUID

    await this.dataSource.transaction(async (manager) => {
      const now = Date.now()

      const ticket = await manager.findOne(Ticket, {
        where: { id: input.ticketId },
        lock: { mode: 'pessimistic_write' }
      })

      if (!ticket) throw new RpcException('TicketNotFound')

      ticketUserId = ticket.userId

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
    })

    const freshTicket = await this.ticketRepo.findOneByOrFail({ id: input.ticketId })
    await this.mailer.notifyUserSupportReplied(freshTicket, ticketUserId!)

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
    onlyOwner: boolean = true
  ): Promise<Pagination<Ticket>> {

    const itemFieldsMap = fieldsMap?.items ?? {}
    const scalarFields = GraphQLUtils.getScalarFields(itemFieldsMap)
    const columns = GraphQLUtils.ensureRequiredFields(
      scalarFields,
      this.REQUIRED_TICKET_FIELDS
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
    page = {
      ...page,
      items: page.items.map((i) => {
        i.publicId = this.generateReadablePublicId(i.publicId)
        if (i.messages) {
          i.messages = i.messages.map((m,) => {
            m.publicId = this.generateReadablePublicId(m.publicId, 'Message')
            return m
          })
        }
        return i
      })
    }
    return page
  }

  async getTicketDetail(
    ticketId: UUID,
    userId: UUID,
    fieldsMap: GraphQLFieldsMap,
    onlyOwner: boolean = true
  ): Promise<TicketDetailDTO> {

    const ticketFields = fieldsMap.ticket ?? {}
    const scalarFields = GraphQLUtils.getScalarFields(ticketFields)

    const ticketColumns = GraphQLUtils.ensureRequiredFields(
      scalarFields,
      this.REQUIRED_TICKET_FIELDS
    )

    let qb = this.ticketRepo.createQueryBuilder('t')
      .select(ticketColumns.map(col => `t.${col}`))
      .where('t.id = :ticketId', { ticketId })

    if (onlyOwner) {
      qb = qb.andWhere('t.user_id = :userId', { userId })
    }

    const joins = TypeOrmUtils.filterJoinsForEntity(fieldsMap, ['messages'])
    qb = TypeOrmUtils.addJoins(qb, 't', joins as GraphQLFieldsMap)

    const ticket = await qb.getOne()
    if (!ticket) throw new RpcException('TicketNotFound')

    if (!fieldsMap.messages) {
      return { ticket, messages: [] }
    }

    const msgScalarFields = GraphQLUtils.getScalarFields(fieldsMap.messages)
    const msgColumns = GraphQLUtils.ensureRequiredFields(
      msgScalarFields,
      this.REQUIRED_MESSAGE_FIELDS
    )

    const messages = await this.msgRepo.createQueryBuilder('m')
      .select(msgColumns.map(col => `m.${col}`))
      .where('m.ticket_id = :ticketId', { ticketId })
      .orderBy('m.created_at', 'ASC')
      .getMany()

    ticket.publicId = this.generateReadablePublicId(ticket.publicId)

    return {
      ticket,
      messages: messages.map((m) => {
        m.publicId = this.generateReadablePublicId(m.publicId, 'Message')
        return m
      })
    }
  }

  async listTicketMessages(
    ticketId: UUID,
    userId: UUID,
    options: IPaginationOptions,
    fieldsMap: GraphQLFieldsMap,
    onlyOwner: boolean = true
  ): Promise<Pagination<TicketMessage>> {

    if (onlyOwner) {
      const owns = await this.ticketRepo.exists({
        where: { id: ticketId, userId }
      })
      if (!owns) {
        throw new RpcException('TicketNotFound')        
      }
    }

    const itemFieldsMap = fieldsMap?.items ?? {}
    const scalarFields = GraphQLUtils.getScalarFields(itemFieldsMap)
    const columns = GraphQLUtils.ensureRequiredFields(
      scalarFields,
      this.REQUIRED_MESSAGE_FIELDS
    )

    const qb = this.msgRepo.createQueryBuilder('m')
      .select(columns.map(col => `m.${col}`))
      .where('m.ticket_id = :ticketId', { ticketId })
      .orderBy('m.created_at', 'DESC')

    let page = await paginate<TicketMessage>(qb, options)

    page = {
      ...page,
      items: page.items.map((m) => {
        m.publicId = this.generateReadablePublicId(m.publicId, 'Message')
        return m
      })
    }

    return page
  }


  // -----------------------------
  // Private helpers
  // -----------------------------

  private stampTicket(ticket: Ticket, now: number) {
    (ticket as unknown as Record<string, Maybe<string>>).createdAt ??= String(now)
    ticket.updatedAt = String(now)
    ticket.lastMessageAt = String(now)
  }

  private generateReadablePublicId(publicId: string, scope: 'Ticket' | 'Message' = 'Ticket'): string {
    const prefix = scope === 'Ticket' ? 'MTCK-#' : 'MTCKM-#'
    if (TypeGuards.isThruthyString(publicId) && /^\d+$/.test(publicId)) {
      return `${prefix}${publicId.padStart(9, '0')}`
    }
    return prefix + '-f-' + parseInt(randomBytes(8).toString('hex'), 16).toString().padStart(16, '0')
  }

  private makeUserMessage(input: {
    ticketId: UUID
    userId: UUID
    delta: JsonValue
    html: string
    now: number
  }) {
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
  }) {
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
