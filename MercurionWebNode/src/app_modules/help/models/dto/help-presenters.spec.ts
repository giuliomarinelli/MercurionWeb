import { UUID } from 'crypto'
import { JsonValue } from 'src/models/json.types'
import { AuthorType } from '../enums/author-type.enum'
import { TicketStatus } from '../enums/ticket-status.enum'
import { presentMessage, presentTicket } from './help-presenters'

const ticketId = '018f0c5c-7d4e-7abc-8def-0123456789ab' as UUID
const userId = '018f0c5c-7d4e-7abc-8def-0123456789ac' as UUID
const messageId = '018f0c5c-7d4e-7abc-8def-0123456789ad' as UUID

describe('Help presenters', () => {
  it('constructs explicit views without mutating persistence sources', () => {
    const message = {
      id: messageId,
      publicId: '7',
      ticketId,
      authorType: AuthorType.User,
      authorId: userId,
      userId,
      contentDelta: { ops: [{ insert: 'hello' }] } as JsonValue,
      contentHtml: '<p>hello</p>',
      createdAt: '100',
    } as const
    const ticket = {
      id: ticketId,
      publicId: '42',
      userId,
      subject: 'Subject',
      status: TicketStatus.Open,
      lastMessageAt: '100',
      createdAt: '100',
      updatedAt: '100',
      messages: [message],
    } as const
    const ticketBefore = structuredClone(ticket)
    const messageBefore = structuredClone(message)

    const response = presentTicket(ticket, {
      canViewUsers: true,
      userFullName: 'Ada Lovelace',
      authorFullNames: new Map([[String(userId), 'Ada Lovelace']]),
    })

    expect(response.publicId).toBe('MTCK-000000042')
    expect(response.messages?.[0].publicId).toBe('MTCKM-000000007')
    expect(response.messages?.[0].contentDelta).toBe('{"ops":[{"insert":"hello"}]}')
    expect(response.userFullName).toBe('Ada Lovelace')
    expect(ticket).toEqual(ticketBefore)
    expect(message).toEqual(messageBefore)
  })

  it('uses an explicit visibility view for hidden user/support fields', () => {
    const source = {
      id: messageId,
      publicId: '7',
      ticketId,
      authorType: AuthorType.Support,
      authorId: null,
      userId,
      contentDelta: { ops: [] } as JsonValue,
      contentHtml: '',
      createdAt: '100',
    } as const

    expect(presentMessage(source, { canViewUsers: false })).toMatchObject({
      publicId: 'MTCKM-000000007',
      authorId: undefined,
      userId: undefined,
      authorFullName: undefined,
      userFullName: undefined,
    })
  })
})
