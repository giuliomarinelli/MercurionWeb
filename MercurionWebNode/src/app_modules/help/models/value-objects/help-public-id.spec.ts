import { getApplicationError } from 'src/exception-handling/application-error'
import {
  formatHelpPublicId,
  helpPublicIdSource,
  isMessagePublicId,
  isTicketPublicId,
  messagePublicIdCodec,
  parseHelpPublicId,
  parseMessagePublicId,
  parseTicketPublicId,
  ticketPublicIdCodec,
} from './help-public-id'

describe('Help public ID formatter', () => {
  it.each([
    ['Ticket', '1', 'MTCK-000000001'],
    ['Ticket', '123456789', 'MTCK-123456789'],
    ['Ticket', '12345678901234567890', 'MTCK-12345678901234567890'],
    ['Message', '1', 'MTCKM-000000001'],
    ['Message', '123456789', 'MTCKM-123456789'],
  ])('formats %s identity %s deterministically', (scope, raw, expected) => {
    expect(formatHelpPublicId(raw, scope as 'Ticket' | 'Message')).toBe(expected)
    expect(formatHelpPublicId(raw, scope as 'Ticket' | 'Message')).toBe(expected)
  })

  it.each([undefined, null, '', ' ', '12x', '-1', 1, 1n])(
    'rejects malformed persisted identity %p with a typed internal error',
    raw => {
      try {
        formatHelpPublicId(raw, 'Ticket')
        throw new Error('expected formatting to fail')
      } catch (error) {
        expect(getApplicationError(error)?.code).toBe('HELP_PUBLIC_ID_INVALID')
      }
    },
  )

  it('round-trips family-specific canonical values without mixing families', () => {
    const ticket = ticketPublicIdCodec.format('1')
    const message = messagePublicIdCodec.format('1')

    expect(ticket).toBe('MTCK-000000001')
    expect(message).toBe('MTCKM-000000001')
    expect(parseTicketPublicId(ticket)).toBe(ticket)
    expect(parseMessagePublicId(message)).toBe(message)
    expect(parseHelpPublicId(ticket)).toBe(ticket)
    expect(parseHelpPublicId(message)).toBe(message)
    expect(helpPublicIdSource(ticket)).toBe('1')
    expect(helpPublicIdSource(message)).toBe('1')
    expect(isTicketPublicId(ticket)).toBe(true)
    expect(isMessagePublicId(message)).toBe(true)
    expect(isTicketPublicId(message)).toBe(false)
    expect(isMessagePublicId(ticket)).toBe(false)
  })

  it.each([
    'MTCK-1',
    'MTCK-000000000',
    'MTCK-00000000000000000000',
    'MTCKM-1',
    'MTCKM-000000000',
    'MTCK-000000001 ',
    'MTCKM-000000001',
  ])('rejects non-canonical or cross-family values: %s', value => {
    expect(() => parseTicketPublicId(value)).toThrow()
  })

  it('rejects invalid persisted sources at the codec boundary', () => {
    for (const value of ['0', '01', '-1', '']) {
      expect(() => ticketPublicIdCodec.format(value)).toThrow()
      expect(() => messagePublicIdCodec.format(value)).toThrow()
    }
  })
})
