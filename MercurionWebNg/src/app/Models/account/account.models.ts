import { WritableSignal } from "@angular/core"
import { UserGender } from "../auth/user.models"
import { TinyHistoryDTO } from "../history.models"
import { AuthProvider } from "../auth/provider.models"

export interface UserData {
  email?: string | null
  ts?: number
}

export interface ChangePasswordDTO {
  oldPassword?: string
  newPassword: string
}

export interface ProfileDTO {
  firstName: string
  lastName: string
  gender: UserGender
  job: string | null
  obscuredEmail: string
  obscuredPhone: string | null
  avatarId: string | null
  recentHistory: TinyHistoryDTO[]
  personalMoleculeCount: number
  chemblMoleculeCount: number
  collectionCount: number
  initials: string
}

export type ProfileRegistryDTO = Pick<ProfileDTO, 'firstName' | 'lastName' | 'gender' | 'job'>

export type ProfileRegistryClientDTO = ProfileRegistryDTO & {
  initials: string
}

export type MfaStrategy = 'EMAIL_OTP' | 'SMS_OTP' | 'APP_TOTP' | 'BACKUP_CODE'

export type MfaView = 'CHOOSE_METHOD' | '' | MfaStrategy

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

export interface SessionDTOExt extends SessionDTO {
  triggerDisappear: WritableSignal<boolean>
  isBeingDeleted: boolean
}

export interface ChangePhoneDTO {
  phoneNumber: string
  internationalPrefix: string
}

export interface EmailDTO {
  email: string
}

export interface RecoverCredentialsDTO {
  newEmail: string
  newPassword: string
}

export interface RecoveryCodeDTO {
  code: string
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
