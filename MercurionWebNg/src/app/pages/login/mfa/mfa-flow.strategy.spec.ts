import { TestBed } from '@angular/core/testing'
import { NEVER, Subject, of } from 'rxjs'
import type {
  ConfirmWithAccessTokenAndInitialsDTO,
  ConfirmWithTotpMetaDTO,
  MfaStrategy
} from '@mercurion/rest-contracts'
import { AuthService } from '../../../services/auth.service'
import { MfaStrategyRegistry, reduceMfaFlowState, type MfaStrategyContext } from './mfa-flow.strategy'

const context: MfaStrategyContext = {
  preAuth: {
    version: 1,
    kind: 'mfa',
    preAuthorizationToken: 'pre-auth',
    expiresAt: Date.now() + 60_000,
    enabledMfaStrategies: ['EMAIL_OTP', 'SMS_OTP', 'APP_TOTP', 'BACKUP_CODE'],
    suspiciousAttempt: false
  },
  fingerprintBase64: 'fingerprint',
  sessionDeviceInfo: { browser: {} },
  trustVerify: false
}

describe('MfaStrategyRegistry', () => {
  let registry: MfaStrategyRegistry
  let auth: jasmine.SpyObj<AuthService>

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login_secondStep', 'login_thirdStep'])
    auth.login_secondStep.and.returnValue(of({} as ConfirmWithTotpMetaDTO))
    auth.login_thirdStep.and.returnValue(NEVER)
    TestBed.configureTestingModule({
      providers: [
        MfaStrategyRegistry,
        { provide: AuthService, useValue: auth }
      ]
    })
    registry = TestBed.inject(MfaStrategyRegistry)
  })

  it('creates a strategy with one contract for every supported method', () => {
    const strategies: MfaStrategy[] = ['EMAIL_OTP', 'SMS_OTP', 'APP_TOTP', 'BACKUP_CODE']
    expect(strategies.map(strategy => registry.create(strategy, context)?.strategy))
      .toEqual(strategies)
    expect(registry.create('UNKNOWN' as MfaStrategy, context)).toBeNull()
  })

  it('keeps method-specific challenge initialization inside the strategy', () => {
    registry.create('EMAIL_OTP', context)!.initialize().subscribe()
    expect(auth.login_secondStep).toHaveBeenCalledWith('EMAIL_OTP', 'pre-auth', false)

    registry.create('APP_TOTP', context)!.initialize().subscribe()
    expect(auth.login_secondStep).toHaveBeenCalledTimes(1)
  })

  it('prevents duplicate submissions until the pending command settles', () => {
    const pending = new Subject<ConfirmWithAccessTokenAndInitialsDTO>()
    auth.login_thirdStep.and.returnValue(pending)
    const strategy = registry.create('APP_TOTP', context)!
    const first = strategy.submit({ totp: '123456' })
    first.subscribe()
    const second = strategy.submit({ totp: '654321' })
    let secondError: unknown
    second.subscribe({ error: error => { secondError = error } })

    expect(auth.login_thirdStep).toHaveBeenCalledTimes(1)
    expect((secondError as Error).message).toBe('MfaCommandPending')
    pending.complete()
    expect(strategy.submit({ totp: '123456' })).toBeTruthy()
  })

  it('cancels strategy-local work', () => {
    const pending = new Subject<ConfirmWithAccessTokenAndInitialsDTO>()
    auth.login_thirdStep.and.returnValue(pending)
    const strategy = registry.create('APP_TOTP', context)!
    let completed = false
    strategy.submit({ totp: '123456' }).subscribe({ complete: () => { completed = true } })
    strategy.cancel()
    expect(completed).toBeTrue()
  })
})

describe('MFA state machine', () => {
  it('has explicit terminal and pending transitions', () => {
    let state = reduceMfaFlowState({ kind: 'initializing' }, { kind: 'ready', strategy: 'APP_TOTP' })
    expect(state).toEqual({ kind: 'challenge-ready', strategy: 'APP_TOTP' })
    state = reduceMfaFlowState(state, { kind: 'submit', strategy: 'APP_TOTP' })
    expect(state.kind).toBe('submitting')
    state = reduceMfaFlowState(state, { kind: 'terminal-invalid', reason: 'expired' })
    expect(state).toEqual({ kind: 'terminal-invalid', reason: 'expired' })
  })
})
