import type {
  BackupCodeDTO as BackupCodeContract,
  MfaStrategy as MfaStrategyContract,
  ChangePasswordDTO as ChangePasswordContract,
  ChangePhoneDTO as ChangePhoneContract,
  CreateFeedbackDTO as CreateFeedbackContract,
  EmailDTO as EmailContract,
  Feedback as FeedbackContract,
  Login_FirstStepDTO as LoginFirstStepContract,
  ProfileRegistryDTO as ProfileRegistryContract,
  RecoverCredentialsDTO as RecoverCredentialsContract,
  RecoveryCodeDTO as RecoveryCodeContract,
  RdkitAreSameStructureDTO as RdkitSameStructureContract,
  RdkitBaseDTO as RdkitBaseContract,
  RdkitGetMoleculePropertiesDTO as RdkitPropertiesContract,
  RdkitToCanonicalSmilesDTO as RdkitCanonicalContract,
  RdkitToCanonicalSmilesOptsDTO as RdkitOptionsContract,
  SignedSessionIdDTO as SignedSessionIdContract,
  SmilesDTO as SmilesContract,
  TotpBodyDTO as TotpBodyContract,
  TotpDTO as TotpContract,
  UpdateFeedbackDTO as UpdateFeedbackContract,
  UserRegisterDTO as UserRegisterContract,
  VerifyBodyDTO as VerifyBodyContract
} from '@mercurion/rest-contracts'
import type { UtcInstant } from '@mercurion/rest-contracts'
import type { BackupCodeDTO } from '../app_modules/auth/models/dto/backup-code.cls.dto'
import type { ChangePasswordDTO } from '../app_modules/auth/models/dto/change-password.dto'
import type { ChangePhoneDTO } from '../app_modules/auth/models/dto/change-phone.cls.dto'
import type { EmailDTO } from '../app_modules/auth/models/dto/email.cls.dto'
import type { Login_FirstStepDTO } from '../app_modules/auth/models/dto/login-first-step.cls.dto'
import type { ProfileRegistryDTO } from '../app_modules/auth/models/dto/profile.dtos'
import type { RecoverCredentialsDTO } from '../app_modules/auth/models/dto/recover-credentials.cls.dto'
import type { RecoveryCodeDTO } from '../app_modules/auth/models/dto/recovery-code.cls.dto'
import type { SignedSessionIdDTO } from '../app_modules/auth/models/dto/signed-session-id.dto'
import type { TotpBodyDTO, TotpDTO } from '../app_modules/auth/models/dto/totp.cls.dto'
import type { VerifyBodyDTO } from '../app_modules/auth/models/dto/verify-body.cls.dto.'
import type { CreateFeedbackDTO } from '../app_modules/feedback/models/dto/create-feedback.dto'
import type { UpdateFeedbackDTO } from '../app_modules/feedback/models/dto/update-feedback.dto'
import type { Feedback } from '../app_modules/feedback/models/entities/feedback.entity'
import type { SmilesDTO } from '../app_modules/mercurion-ai/models/dto/smiles.cls.dto'
import type { RdkitAreSameStructureDTO } from '../app_modules/mercurion-ai/models/dto/rdkit/rdkit-are-same-structures.dto'
import type { RdkitBaseDTO } from '../app_modules/mercurion-ai/models/dto/rdkit/rdkit-base.cls.dto'
import type { RdkitToCanonicalSmilesOptsDTO } from '../app_modules/mercurion-ai/models/dto/rdkit/rd-kit-canonical-smiles-opts.dto'
import type { RdkitToCanonicalSmilesDTO } from '../app_modules/mercurion-ai/models/dto/rdkit/rdkit-canonical-smiles.dto'
import type { RdkitGetMoleculePropertiesDTO } from '../app_modules/mercurion-ai/models/dto/rdkit/rdkit-get-molecule-properties.cls.dto'
import type { UserRegisterDTO } from '../app_modules/user/models/dto/user-register.cls.dto'
import type { MfaStrategy as MfaStrategyDbEnum } from '../app_modules/user/models/enums/mfa-strategy.enum'

type Equivalent<A, B> =
  [A] extends [B]
    ? [B] extends [A]
      ? true
      : false
    : false

type Assert<T extends true> = T
type EnumValue<T> = T extends string ? `${T}` : never

type VerifyBodyWire = Omit<VerifyBodyDTO, 'kind'> & {
  kind: EnumValue<VerifyBodyDTO['kind']>
}

type UserRegisterWire = Omit<UserRegisterDTO, 'gender'> & {
  gender: EnumValue<UserRegisterDTO['gender']>
}

type ProfileRegistryWire = Omit<ProfileRegistryDTO, 'gender'> & {
  gender: EnumValue<ProfileRegistryDTO['gender']>
}

type CreateFeedbackWire = Omit<CreateFeedbackDTO, 'env' | 'source' | 'kind' | 'contextKind'> & {
  env: EnumValue<CreateFeedbackDTO['env']>
  source?: EnumValue<NonNullable<CreateFeedbackDTO['source']>>
  kind?: EnumValue<NonNullable<CreateFeedbackDTO['kind']>>
  contextKind?: EnumValue<NonNullable<CreateFeedbackDTO['contextKind']>>
}

type UpdateFeedbackWire = Omit<UpdateFeedbackDTO, 'status'> & {
  status?: EnumValue<NonNullable<UpdateFeedbackDTO['status']>>
}

type FeedbackWire = Omit<
  Pick<Feedback, keyof FeedbackContract>,
  'id' | 'env' | 'source' | 'kind' | 'contextKind' | 'status'
> & {
  id: string
  env: EnumValue<Feedback['env']>
  source: EnumValue<Feedback['source']>
  kind: EnumValue<Feedback['kind']>
  contextKind: EnumValue<Feedback['contextKind']>
  status: EnumValue<Feedback['status']>
  createdAtMs: UtcInstant
}

// The internal MFA-strategy enum persists opaque DB identifiers as its values, so it cannot
// share the wire-level rest-contracts MfaStrategy union by value. Its KEYS are still the wire
// vocabulary returned to clients (see GeneralUtils.getEnumKeyByValue usage), so this assertion
// guards that the two vocabularies stay in lockstep even though their runtime values differ.
type MfaStrategyDbKeys = keyof typeof MfaStrategyDbEnum

export type RestContractParity = [
  Assert<Equivalent<MfaStrategyDbKeys, MfaStrategyContract>>,
  Assert<Equivalent<EmailDTO, EmailContract>>,
  Assert<Equivalent<Login_FirstStepDTO, LoginFirstStepContract>>,
  Assert<Equivalent<TotpBodyDTO, TotpBodyContract>>,
  Assert<Equivalent<TotpDTO, TotpContract>>,
  Assert<Equivalent<BackupCodeDTO, BackupCodeContract>>,
  Assert<Equivalent<VerifyBodyWire, VerifyBodyContract>>,
  Assert<Equivalent<SignedSessionIdDTO, SignedSessionIdContract>>,
  Assert<Equivalent<ChangePasswordDTO, ChangePasswordContract>>,
  Assert<Equivalent<ChangePhoneDTO, ChangePhoneContract>>,
  Assert<Equivalent<RecoverCredentialsDTO, RecoverCredentialsContract>>,
  Assert<Equivalent<RecoveryCodeDTO, RecoveryCodeContract>>,
  Assert<Equivalent<UserRegisterWire, UserRegisterContract>>,
  Assert<Equivalent<ProfileRegistryWire, ProfileRegistryContract>>,
  Assert<Equivalent<CreateFeedbackWire, CreateFeedbackContract>>,
  Assert<Equivalent<UpdateFeedbackWire, UpdateFeedbackContract>>,
  Assert<Equivalent<FeedbackWire, FeedbackContract>>,
  Assert<Equivalent<SmilesDTO, SmilesContract>>,
  Assert<Equivalent<RdkitBaseDTO, RdkitBaseContract>>,
  Assert<Equivalent<RdkitToCanonicalSmilesOptsDTO, RdkitOptionsContract>>,
  Assert<Equivalent<RdkitGetMoleculePropertiesDTO, RdkitPropertiesContract>>,
  Assert<Equivalent<RdkitToCanonicalSmilesDTO, RdkitCanonicalContract>>,
  Assert<Equivalent<RdkitAreSameStructureDTO, RdkitSameStructureContract>>
]
