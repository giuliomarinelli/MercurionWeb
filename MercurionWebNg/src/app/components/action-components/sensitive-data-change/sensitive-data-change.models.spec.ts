import type { ActiveSensitiveDataChangeInnerScope } from '../../../Models/action/action-overlay.models'
import { sensitiveDataUseCaseFor } from './sensitive-data-change.models'

describe('sensitive-data use-case selection', () => {
  const cases: Array<[ActiveSensitiveDataChangeInnerScope, string]> = [
    ['ChangeEmail', 'email'],
    ['ChangePhone', 'phone'],
    ['AddPhone', 'phone'],
    ['RemovePhone', 'phone'],
    ['ChangePassword', 'password'],
    ['EnableMfa', 'mfa-enable'],
    ['ConfigMfa', 'mfa-configure'],
  ]

  it('maps every supported action scope to a typed use case', () => {
    for (const [scope, kind] of cases) {
      expect(sensitiveDataUseCaseFor(scope).kind).toBe(kind)
    }
  })
})
