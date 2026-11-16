import { UUID } from 'crypto'
import { Scope } from 'src/app_modules/user/models/enums/scope.enum'
import {
  authorizeHelpOperation,
  ownerActor,
  supportActor,
  type HelpActor,
} from './help-authorization.policy'

const ownerId = '018f0c5c-7d4e-7abc-8def-0123456789ac' as UUID
const otherId = '018f0c5c-7d4e-7abc-8def-0123456789ad' as UUID

describe('Help authorization policy', () => {
  const operations = ['list', 'detail', 'messages', 'add-message', 'close'] as const
  const owner = ownerActor(ownerId)
  const support = supportActor(otherId, [Scope.HandleTickets])
  const supportWithUserVisibility = supportActor(otherId, [Scope.HandleTickets, Scope.ViewUsers])

  it.each(operations)('allows an owner to %s where ownership is enforced by the query', (operation) => {
    expect(() => authorizeHelpOperation(owner, operation)).not.toThrow()
  })

  it.each(operations)('allows HandleTickets support to %s', (operation) => {
    expect(() => authorizeHelpOperation(support, operation)).not.toThrow()
  })

  it('keeps ViewUsers independent from ticket handling', () => {
    expect(support.canViewUsers).toBe(false)
    expect(supportWithUserVisibility.canViewUsers).toBe(true)
    expect(() => supportActor(otherId, [Scope.ViewUsers])).toThrow()
  })

  it('does not allow an owner actor to reopen a ticket', () => {
    expect(() => authorizeHelpOperation(owner, 'reopen')).toThrow()
  })

  it('represents only valid owner/support actor combinations', () => {
    const actors: HelpActor[] = [owner, support, supportWithUserVisibility]
    expect(actors).toHaveLength(3)
    expect(() => supportActor(otherId, [Scope.ViewUsers])).toThrow()
  })
})
