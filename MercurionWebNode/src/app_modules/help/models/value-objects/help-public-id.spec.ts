import { getApplicationError } from 'src/exception-handling/application-error'
import { formatHelpPublicId } from './help-public-id'

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
})
