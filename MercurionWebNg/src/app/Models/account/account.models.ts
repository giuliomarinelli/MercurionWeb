import { UserGender } from "../auth/user.models"
import { HistoryDTO } from "../history.models"

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
  recentHistory: HistoryDTO[]
  personalMoleculeCount: number
  chemblMoleculeCount: number
  collectionCount: number
}

export type MfaStrategy = 'EMAIL_OTP' | 'SMS_OTP' | 'APP_TOTP'
