import {
  AuthProvider as AuthProviderContract,
  FeedbackContextKind as FeedbackContextKindContract,
  FeedbackEnv as FeedbackEnvContract,
  FeedbackKind as FeedbackKindContract,
  FeedbackSource as FeedbackSourceContract,
  FeedbackStatus as FeedbackStatusContract,
  HistoryItemEntity as HistoryItemEntityContract,
  MfaStrategy as MfaStrategyContract,
  UserGender as UserGenderContract,
  VerifyKind as VerifyKindContract
} from '@mercurion/rest-contracts'
import { AuthProvider } from '../app_modules/sso/Models/enums/auth-provider.enum'
import { VerifyKind } from '../app_modules/auth/Models/enums/verify-kind.enum'
import { UserGender } from '../app_modules/user/Models/enums/user-gender.enum'
import { HistoryItemEntity } from '../app_modules/history/Models/enums/history-item-entity.enum'
import {
  FeedbackContextKind,
  FeedbackEnv,
  FeedbackKind,
  FeedbackSource,
  FeedbackStatus
} from '../app_modules/feedback/Models/enums/feedback.enums'
import { MfaStrategy as MfaStrategyDbEnum } from '../app_modules/user/Models/enums/mfa-strategy.enum'

describe('Canonical cross-boundary enum parity (SYS-013)', () => {
  it('re-exports AuthProvider from the canonical rest-contracts source without local drift', () => {
    expect(AuthProvider).toBe(AuthProviderContract)
    expect(Object.values(AuthProvider).sort()).toEqual(Object.values(AuthProviderContract).sort())
  })

  it('re-exports VerifyKind from the canonical rest-contracts source without local drift', () => {
    expect(VerifyKind).toBe(VerifyKindContract)
    expect(Object.values(VerifyKind).sort()).toEqual(Object.values(VerifyKindContract).sort())
  })

  it('re-exports UserGender from the canonical rest-contracts source without local drift', () => {
    expect(UserGender).toBe(UserGenderContract)
    expect(Object.values(UserGender).sort()).toEqual(Object.values(UserGenderContract).sort())
  })

  it('re-exports HistoryItemEntity from the canonical rest-contracts source without local drift', () => {
    expect(HistoryItemEntity).toBe(HistoryItemEntityContract)
    expect(Object.values(HistoryItemEntity).sort()).toEqual(Object.values(HistoryItemEntityContract).sort())
  })

  it('re-exports every Feedback enum from the canonical rest-contracts source without local drift', () => {
    expect(FeedbackEnv).toBe(FeedbackEnvContract)
    expect(FeedbackSource).toBe(FeedbackSourceContract)
    expect(FeedbackKind).toBe(FeedbackKindContract)
    expect(FeedbackContextKind).toBe(FeedbackContextKindContract)
    expect(FeedbackStatus).toBe(FeedbackStatusContract)
  })

  it('keeps the internal MFA-strategy DB enum keys aligned with the wire MfaStrategy vocabulary', () => {
    const dbKeys = Object.keys(MfaStrategyDbEnum).sort()
    const wireValues = Object.values(MfaStrategyContract).sort()
    expect(dbKeys).toEqual(wireValues)
  })
})