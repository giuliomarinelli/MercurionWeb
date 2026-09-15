import type { ActiveSensitiveDataChangeInnerScope } from '../../../Models/action/action-overlay.models'

/**
 * The workflow selected by the sensitive-data action. Keeping this as a
 * discriminated union prevents a caller from passing an arbitrary string into
 * the action container.
 */
export type SensitiveDataUseCase =
  | { readonly kind: 'email'; readonly scope: 'ChangeEmail' }
  | { readonly kind: 'phone'; readonly scope: 'ChangePhone' | 'AddPhone' | 'RemovePhone' }
  | { readonly kind: 'password'; readonly scope: 'ChangePassword' }
  | { readonly kind: 'mfa-enable'; readonly scope: 'EnableMfa' }
  | { readonly kind: 'mfa-configure'; readonly scope: 'ConfigMfa' }
  | { readonly kind: 'backup-codes'; readonly scope: 'ConfigMfa' }

export function sensitiveDataUseCaseFor(
  scope: ActiveSensitiveDataChangeInnerScope,
): SensitiveDataUseCase {
  switch (scope) {
    case 'ChangeEmail':
      return { kind: 'email', scope }
    case 'ChangePhone':
    case 'AddPhone':
    case 'RemovePhone':
      return { kind: 'phone', scope }
    case 'ChangePassword':
      return { kind: 'password', scope }
    case 'EnableMfa':
      return { kind: 'mfa-enable', scope }
    case 'ConfigMfa':
      return { kind: 'mfa-configure', scope }
    default:
      return assertNever(scope)
  }
}

export function assertNever(value: never): never {
  throw new Error(`Unsupported sensitive-data workflow: ${String(value)}`)
}
