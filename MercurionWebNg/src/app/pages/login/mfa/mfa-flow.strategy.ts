import { Injectable } from '@angular/core'
import { Observable, Subject, defer, finalize, map, of, takeUntil, throwError } from 'rxjs'
import type {
  BackupCodeDTO,
  ConfirmWithAccessTokenAndInitialsDTO,
  MfaStrategy,
  SessionDeviceInfo,
  TotpBodyDTO
} from '@mercurion/rest-contracts'
import type { PersistedPreAuthState } from '../../../Models/auth/pre-auth.models'
import { AuthService } from '../../../services/auth.service'

export type MfaCode = TotpBodyDTO | BackupCodeDTO

export type MfaFlowState =
  | { kind: 'initializing'; strategy?: MfaStrategy }
  | { kind: 'challenge-ready'; strategy: MfaStrategy }
  | { kind: 'submitting'; strategy: MfaStrategy }
  | { kind: 'recoverable-error'; strategy: MfaStrategy; message: string }
  | { kind: 'completed'; strategy: MfaStrategy }
  | {
    kind: 'terminal-invalid'
    reason: 'missing' | 'invalid' | 'expired' | 'unsupported' | 'cancelled'
  }

export type MfaFlowEvent =
  | { kind: 'initialize'; strategy?: MfaStrategy }
  | { kind: 'ready'; strategy: MfaStrategy }
  | { kind: 'submit'; strategy: MfaStrategy }
  | { kind: 'recoverable-error'; strategy: MfaStrategy; message: string }
  | { kind: 'complete'; strategy: MfaStrategy }
  | { kind: 'terminal-invalid'; reason: Extract<MfaFlowState, { kind: 'terminal-invalid' }>['reason'] }

export function reduceMfaFlowState(state: MfaFlowState, event: MfaFlowEvent): MfaFlowState {
  switch (event.kind) {
    case 'initialize':
      return { kind: 'initializing', strategy: event.strategy }
    case 'ready':
      return { kind: 'challenge-ready', strategy: event.strategy }
    case 'submit':
      return { kind: 'submitting', strategy: event.strategy }
    case 'recoverable-error':
      return { kind: 'recoverable-error', strategy: event.strategy, message: event.message }
    case 'complete':
      return { kind: 'completed', strategy: event.strategy }
    case 'terminal-invalid':
      return { kind: 'terminal-invalid', reason: event.reason }
  }
}

export interface MfaStrategyContext {
  readonly preAuth: PersistedPreAuthState
  readonly fingerprintBase64: string
  readonly sessionDeviceInfo: SessionDeviceInfo
  readonly trustVerify: boolean
}

export interface MfaStrategySession {
  readonly strategy: MfaStrategy
  readonly codeLength: number
  readonly challengeLabel: string
  initialize(): Observable<void>
  submit(code: MfaCode): Observable<ConfirmWithAccessTokenAndInitialsDTO>
  cancel(): void
}

abstract class BaseMfaStrategy implements MfaStrategySession {
  protected readonly cancelled$ = new Subject<void>()
  private pending = false

  abstract readonly codeLength: number
  abstract readonly challengeLabel: string

  constructor(
    readonly strategy: MfaStrategy,
    protected readonly auth: AuthService,
    protected readonly context: MfaStrategyContext
  ) {}

  initialize(): Observable<void> {
    return of(undefined)
  }

  submit(code: MfaCode): Observable<ConfirmWithAccessTokenAndInitialsDTO> {
    if (this.pending) {
      return throwError(() => new Error('MfaCommandPending'))
    }

    this.pending = true
    return defer(() => this.auth.login_thirdStep(
      this.strategy,
      code,
      {
        fingerprintBase64: this.context.fingerprintBase64,
        sessionDeviceInfo: this.context.sessionDeviceInfo
      },
      this.context.preAuth.preAuthorizationToken,
      this.context.trustVerify
    )).pipe(
      takeUntil(this.cancelled$),
      finalize(() => { this.pending = false })
    )
  }

  cancel(): void {
    this.cancelled$.next()
    this.pending = false
  }
}

class EmailOtpStrategy extends BaseMfaStrategy {
  readonly codeLength = 6
  readonly challengeLabel = 'Codice monouso'

  override initialize(): Observable<void> {
    return this.auth.login_secondStep(
      'EMAIL_OTP',
      this.context.preAuth.preAuthorizationToken,
      this.context.trustVerify
    ).pipe(takeUntil(this.cancelled$), map(() => undefined))
  }
}

class SmsOtpStrategy extends BaseMfaStrategy {
  readonly codeLength = 6
  readonly challengeLabel = 'Codice monouso'

  override initialize(): Observable<void> {
    return this.auth.login_secondStep(
      'SMS_OTP',
      this.context.preAuth.preAuthorizationToken,
      false
    ).pipe(takeUntil(this.cancelled$), map(() => undefined))
  }
}

class AppTotpStrategy extends BaseMfaStrategy {
  readonly codeLength = 6
  readonly challengeLabel = 'Codice monouso'
}

class BackupCodeStrategy extends BaseMfaStrategy {
  readonly codeLength = 14
  readonly challengeLabel = 'Codice di backup'
}

@Injectable({ providedIn: 'root' })
export class MfaStrategyRegistry {
  constructor(private readonly auth: AuthService) {}

  create(strategy: MfaStrategy, context: MfaStrategyContext): MfaStrategySession | null {
    switch (strategy) {
      case 'EMAIL_OTP':
        return new EmailOtpStrategy(strategy, this.auth, context)
      case 'SMS_OTP':
        return new SmsOtpStrategy(strategy, this.auth, context)
      case 'APP_TOTP':
        return new AppTotpStrategy(strategy, this.auth, context)
      case 'BACKUP_CODE':
        return new BackupCodeStrategy(strategy, this.auth, context)
      default:
        return null
    }
  }
}
