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
export {
  FINGERPRINT_CONTRACT_VERSION,
  parseFingerprintData,
  parseSessionDeviceInfo
} from './fingerprint-contract'
export type {
  FingerprintContract,
  FingerprintContractVersion,
  FingerprintData,
  SessionDeviceInfo
} from './fingerprint-contract'
export {
  RDKIT_OPERATIONS,
  RDKIT_SMILES_MAX_LENGTH
} from './rdkit-contract'
export type {
  RdkitAreSameStructureDTO,
  RdkitAreSameStructureResponse,
  RdkitAreSameStructureWire,
  RdkitBaseDTO,
  RdkitCanonicalSmilesWire,
  RdkitGetMoleculePropertiesDTO,
  RdkitGetMoleculePropertiesResponse,
  RdkitGetMoleculePropertiesResult,
  RdkitGetMoleculePropertiesWire,
  RdkitOperation,
  RdkitToCanonicalSmilesDTO,
  RdkitToCanonicalSmilesOptsDTO,
  RdkitToCanonicalSmilesResponse,
  RdkitUpstreamError
} from './rdkit-contract'

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

// Canonical enum/union contracts. Each value set below is the single source of truth
// consumed by both Angular and Nest; local per-project enum files must re-export these
// symbols rather than redeclaring their own literal values (SYS-013).
export const AuthProvider = Object.freeze({
  Mercurion: 'Mercurion',
  Google: 'Google',
  GitHub: 'GitHub',
  LinkedIn: 'LinkedIn',
  Discord: 'Discord'
} as const)
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider]
export type SSO_AuthProvider = Exclude<AuthProvider, 'Mercurion'>

export const MfaStrategy = Object.freeze({
  EMAIL_OTP: 'EMAIL_OTP',
  SMS_OTP: 'SMS_OTP',
  APP_TOTP: 'APP_TOTP',
  BACKUP_CODE: 'BACKUP_CODE'
} as const)
export type MfaStrategy = (typeof MfaStrategy)[keyof typeof MfaStrategy]
export type MfaView = 'CHOOSE_METHOD' | '' | MfaStrategy

export const UserGender = Object.freeze({
  M: 'M',
  F: 'F',
  Undefined: 'Undefined'
} as const)
export type UserGender = (typeof UserGender)[keyof typeof UserGender]
export type UserGenderControl = UserGender | ''

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

export const VerifyKind = Object.freeze({
  TOTP: 'totp',
  BACKUP: 'backup'
} as const)
export type VerifyKind = (typeof VerifyKind)[keyof typeof VerifyKind]

export interface VerifyBodyDTO {
  kind: VerifyKind
  payload: TotpBodyDTO | BackupCodeDTO
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

export const HistoryItemEntity = Object.freeze({
  MoleculeCollection: 'molecule_collections',
  MoleculeCollectionItem: 'molecule_collection_items'
} as const)
export type HistoryItemEntity = (typeof HistoryItemEntity)[keyof typeof HistoryItemEntity]
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

export const FeedbackEnv = Object.freeze({
  STAGING: 'staging',
  PROD: 'prod'
} as const)
export type FeedbackEnv = (typeof FeedbackEnv)[keyof typeof FeedbackEnv]

export const FeedbackSource = Object.freeze({
  MANUAL_PAGE: 'manual_page',
  PROMPTED: 'prompted'
} as const)
export type FeedbackSource = (typeof FeedbackSource)[keyof typeof FeedbackSource]

export const FeedbackKind = Object.freeze({
  BUG: 'bug',
  UX: 'ux',
  IDEA: 'idea',
  QUESTION: 'question',
  OTHER: 'other'
} as const)
export type FeedbackKind = (typeof FeedbackKind)[keyof typeof FeedbackKind]

export const FeedbackContextKind = Object.freeze({
  GLOBAL: 'global',
  NAVIGATION: 'navigation',
  SEARCH: 'search',
  PREDICTION: 'prediction',
  EDITOR: 'editor',
  COLLECTION: 'collection',
  EXPORT: 'export',
  AUTH: 'auth',
  PERFORMANCE: 'performance',
  ERROR: 'error'
} as const)
export type FeedbackContextKind = (typeof FeedbackContextKind)[keyof typeof FeedbackContextKind]

export const FeedbackStatus = Object.freeze({
  NEW: 'new',
  TRIAGED: 'triaged',
  RESOLVED: 'resolved',
  SPAM: 'spam'
} as const)
export type FeedbackStatus = (typeof FeedbackStatus)[keyof typeof FeedbackStatus]

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
