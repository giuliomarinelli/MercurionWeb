export type RestContractVersion = '1.0.0'

export {
  APPLICATION_ERROR_CATALOG,
  ApplicationErrorCode,
  getApplicationErrorDefinition,
  isApplicationErrorCode,
  isApplicationErrorPayload,
  resolveLegacyApplicationErrorCode
} from './application-errors'
export type {
  ApplicationErrorCode as ApplicationErrorCodeType,
  ApplicationErrorDefinition,
  ApplicationErrorPayload
} from './application-errors'

export interface PageModel<T> {
  items: T[]
  itemCount: number
  totalItems: number
  itemsPerPage: number
  totalPages: number
  currentPage: number
}

export interface ConfirmDTO {
  statusCode: number
  timestamp: string
  message: string
}

export interface ErrorRes {
  statusCode: number
  error: string
  code?: import('./application-errors').ApplicationErrorCode
  message?: string
  timestamp: string
  requestId: string
  path: string
}

export interface TotpMetadata {
  generatedAt: number
  expiresAt: number
}

export interface TotpAuthMetadata extends TotpMetadata {
  secret?: string
  otpauthUrl?: string
  qrCode?: string
}

export interface MfaAuthMetadata extends TotpAuthMetadata {
  secureToken: string
}

export interface ConfirmWithObsContDTO extends ConfirmDTO {
  obscuredEmail?: string
  obscuredPhoneNumber?: string
}

export interface ConfirmWithAccessTokenAndInitialsDTO extends ConfirmDTO {
  accessToken: string
  ws_accessToken: string
  initials: string
  deviceId: string
}

export interface ConfirmWithTotpMetaDTO extends ConfirmDTO, TotpMetadata {}

export interface ConfirmMfaChange extends ConfirmDTO, MfaAuthMetadata {}

export interface ConfirmChangeDTO extends ConfirmWithObsContDTO, TotpMetadata {
  emailVerificationToken?: string
  phoneNumberVerificationToken?: string
}

export interface ConfirmWithRecoveryCodeDTO extends ConfirmDTO {
  recoveryCode: string
}

export interface ConfirmWithRecoveryTokenDTO extends ConfirmDTO {
  recoveryToken: string
}

export interface ConfirmWithPhoneMfaFeedback extends ConfirmDTO {
  phoneMfaDisabled: boolean
}

export type AuthProvider = 'Mercurion' | 'Google' | 'GitHub' | 'LinkedIn' | 'Discord'
export type SSO_AuthProvider = Exclude<AuthProvider, 'Mercurion'>
export type MfaStrategy = 'EMAIL_OTP' | 'SMS_OTP' | 'APP_TOTP' | 'BACKUP_CODE'
export type MfaView = 'CHOOSE_METHOD' | '' | MfaStrategy
export type UserGenderControl = 'M' | 'F' | 'Undefined' | ''
export type UserGender = Exclude<UserGenderControl, ''>

export interface AuthenticationData {
  obscuredEmail?: string
  obscuredPhoneNumber?: string
  needsMfa: boolean
  enabledMfaStrategies: MfaStrategy[]
  suspiciousAttempt: boolean
}

export interface Login_FirstStep_Data extends AuthenticationData {
  preAuthorizationToken?: string
  accessToken?: string
  ws_accessToken?: string
  initials: string
  deviceId: string
}

export type Confirm_Login_FirstStepDTO = ConfirmDTO & Login_FirstStep_Data

export interface EmailDTO {
  email: string
}

export interface Login_FirstStepDTO {
  email: string
  password: string
  remember: boolean
}

export interface SignedSessionIdDTO {
  signedSessionId: string
}

export interface TotpBodyDTO {
  totp: string
}

export interface TotpDTO extends TotpBodyDTO {
  secureToken: string
}

export interface BackupCodeDTO {
  code: string
}

export type VerifyKind = 'totp' | 'backup'

export interface VerifyBodyDTO {
  kind: VerifyKind
  payload: TotpBodyDTO | BackupCodeDTO
}

export interface SessionDeviceInfo {
  osPlatform: string
  useragent: string
  browser: {
    name: string
    version: string
  }
}

export interface FingerprintData {
  audio: {
    sampleHash: number
    oscillator: string
    maxChannels: number
  }
  hardware: {
    videocard: {
      vendor: string
      renderer: string
    }
  }
  locales: {
    languages: string
  }
  plugins: {
    plugins: string[]
  }
  screen: {
    is_touchscreen: boolean
    colorDepth: number
  }
  system: {
    platform: string
    productSub: string
    product: string
    hardwareConcurrency: number
  }
  webgl: {
    commonImageHash: string
  }
  math: {
    acos: number
    cos: number
    log: number
    pi: number
    sqrt: number
  }
}

export interface UserRegisterDTO {
  firstName: string
  lastName: string
  email: string
  job?: string | null
  gender: UserGender
  password: string
}

export interface ChangePasswordDTO {
  oldPassword?: string
  newPassword: string
}

export interface ChangePhoneDTO {
  phoneNumber: string
  internationalPrefix: string
}

export interface RecoverCredentialsDTO {
  newEmail: string
  newPassword: string
}

export interface RecoveryCodeDTO {
  code: string
}

export interface HistoryDTO {
  id: string
  itemEntity: HistoryItemEntity
  touchedAt: number
  itemId: string
  itemName: string
  flagIds: string
}

export type HistoryItemEntity = 'molecule_collections' | 'molecule_collection_items'
export type TinyHistoryDTO = Pick<HistoryDTO, 'id' | 'itemEntity' | 'itemId' | 'touchedAt'>

export interface ProfileDTO {
  firstName: string
  lastName: string
  gender: UserGender
  job: string | null | undefined
  obscuredEmail: string
  obscuredPhone: string | null
  avatarId: string | null
  recentHistory: TinyHistoryDTO[]
  personalMoleculeCount: number
  chemblMoleculeCount: number
  collectionCount: number
  initials: string
}

export interface ProfileRegistryDTO {
  firstName: string
  lastName: string
  gender: UserGender
  job?: string | null
}

export interface ProfileRegistryClientDTO extends ProfileRegistryDTO {
  initials: string
}

export interface MfaStrategyDTO {
  strategy: MfaStrategy
  enabled: boolean
}

export interface SessionDTO {
  id: string
  createdAt: number
  expiresAt: number
  lastAccessedAt: number
  valid?: boolean
  current: boolean
  location: string
  browser: string
  provider: AuthProvider
}

export interface ProvidedEmailDTO {
  email: string
  provider: AuthProvider
}

export interface VersionDTO {
  version: string
  versionHash: string
}

export interface BackupCodeStatusDTO {
  total: number
  used: number
  remaining: number
}

export interface BackupCodesDTO {
  codes: string[]
}

export interface PhonePrefixDTO {
  id: number
  iso2: string
  phonecode: string
}

export type FeedbackEnv = 'staging' | 'prod'
export type FeedbackSource = 'manual_page' | 'prompted'
export type FeedbackKind = 'bug' | 'ux' | 'idea' | 'question' | 'other'
export type FeedbackContextKind =
  | 'global'
  | 'navigation'
  | 'search'
  | 'prediction'
  | 'editor'
  | 'collection'
  | 'export'
  | 'auth'
  | 'performance'
  | 'error'
export type FeedbackStatus = 'new' | 'triaged' | 'resolved' | 'spam'

export interface Feedback {
  id: string
  createdAtMs: string
  env: FeedbackEnv
  source: FeedbackSource
  kind: FeedbackKind
  ratingUtility: number | null
  ratingClarity: number | null
  ratingExperience: number | null
  message: string | null
  contextKind: FeedbackContextKind
  contextRef: string | null
  contextMeta: Record<string, unknown> | null
  clientVersion: string | null
  status: FeedbackStatus
  internalNote: string | null
  tags: string[] | null
}

export interface UpdateFeedbackDTO {
  status?: FeedbackStatus
  internalNote?: string
  tags?: string[]
}

export interface CreateFeedbackDTO {
  env: FeedbackEnv
  source?: FeedbackSource
  kind?: FeedbackKind
  contextKind?: FeedbackContextKind
  contextRef?: string
  contextMeta?: Record<string, unknown>
  clientVersion?: string
  ratingUtility?: number
  ratingClarity?: number
  ratingExperience?: number
  message?: string
}

export interface DeleteFeedbackResponse {
  ok: boolean
}

export interface RdkitToCanonicalSmilesOptsDTO {
  isomeric?: boolean
  kekule?: boolean
}

export interface RdkitBaseDTO {
  accessToken?: string
}

export interface RdkitAreSameStructureDTO extends RdkitBaseDTO {
  a: string
  b: string
}

export interface RdkitToCanonicalSmilesDTO extends RdkitBaseDTO {
  smiles: string
  opts?: RdkitToCanonicalSmilesOptsDTO
}

export interface RdkitGetMoleculePropertiesDTO extends RdkitBaseDTO {
  smiles: string
}

export interface RdkitGetMoleculePropertiesResult {
  mwFreebase: number | null
  alogp: number | null
  hba: number | null
  hbd: number | null
  psa: number | null
  rtb: number | null
}

export interface Tox21Inference {
  probability: number
  is_positive: boolean
  threshold: number
}

export interface Tox21Prediction {
  'SR-ATAD5'?: Tox21Inference
  'NR-AhR'?: Tox21Inference
  'SR-MMP'?: Tox21Inference
  'SR-p53'?: Tox21Inference
}

export interface SmilesDTO {
  smiles: string
}

export interface EmbeddingNeighbor {
  molregno: number
  distance: number
}

export type EmbeddingResponse = number[] | EmbeddingNeighbor[]

export interface MaintenanceBypassResponse {
  ok: true
}
