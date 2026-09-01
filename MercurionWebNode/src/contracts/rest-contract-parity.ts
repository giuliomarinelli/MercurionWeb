import type {
  BackupCodeDTO as BackupCodeContract,
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
import type { BackupCodeDTO } from '../app_modules/auth/Models/DTO/backup-code.cls.dto'
import type { ChangePasswordDTO } from '../app_modules/auth/Models/DTO/change-password.dto'
import type { ChangePhoneDTO } from '../app_modules/auth/Models/DTO/change-phone.cls.dto'
import type { EmailDTO } from '../app_modules/auth/Models/DTO/email.cls.dto'
import type { Login_FirstStepDTO } from '../app_modules/auth/Models/DTO/login-first-step.cls.dto'
import type { ProfileRegistryDTO } from '../app_modules/auth/Models/DTO/profile.dtos'
import type { RecoverCredentialsDTO } from '../app_modules/auth/Models/DTO/recover-cretentials.cls.dto'
import type { RecoveryCodeDTO } from '../app_modules/auth/Models/DTO/recovery-code.cls.dto'
import type { SignedSessionIdDTO } from '../app_modules/auth/Models/DTO/signed-session-id.dto'
import type { TotpBodyDTO, TotpDTO } from '../app_modules/auth/Models/DTO/totp.cls.dto'
import type { VerifyBodyDTO } from '../app_modules/auth/Models/DTO/verify-body.cls.dto.'
import type { CreateFeedbackDTO } from '../app_modules/feedback/Models/DTO/create-feedback.dto'
import type { UpdateFeedbackDTO } from '../app_modules/feedback/Models/DTO/update-feedback.dto'
import type { Feedback } from '../app_modules/feedback/Models/entities/feedback.entity'
import type { SmilesDTO } from '../app_modules/mercurion-ai/Models/DTO/smiles.cls.dto'
import type { RdkitAreSameStructureDTO } from '../app_modules/mercurion-ai/Models/DTO/rdkit/rdkit-are-same-structures.dto'
import type { RdkitBaseDTO } from '../app_modules/mercurion-ai/Models/DTO/rdkit/rdkit-base.cls.dto'
import type { RdkitToCanonicalSmilesOptsDTO } from '../app_modules/mercurion-ai/Models/DTO/rdkit/rd-kit-canonical-smiles-opts.dto'
import type { RdkitToCanonicalSmilesDTO } from '../app_modules/mercurion-ai/Models/DTO/rdkit/rdkit-canonical-smiles.dto'
import type { RdkitGetMoleculePropertiesDTO } from '../app_modules/mercurion-ai/Models/DTO/rdkit/rdkit-get-molecule-properties.cls.dto'
import type { UserRegisterDTO } from '../app_modules/user/Models/DTO/user-register.cls.dto'

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
}

export type RestContractParity = [
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
