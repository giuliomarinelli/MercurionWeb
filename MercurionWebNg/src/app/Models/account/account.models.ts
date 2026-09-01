import { WritableSignal } from "@angular/core"
import type { SessionDTO } from '@mercurion/rest-contracts'

export interface UserData {
  email?: string | null
  ts?: number
}

export type {
  BackupCodeStatusDTO,
  ChangePasswordDTO,
  ChangePhoneDTO,
  MfaStrategy,
  MfaStrategyDTO,
  MfaView,
  ProfileDTO,
  ProfileRegistryClientDTO,
  ProfileRegistryDTO,
  ProvidedEmailDTO,
  RecoverCredentialsDTO,
  RecoveryCodeDTO,
  SessionDTO,
  VersionDTO
} from '@mercurion/rest-contracts'

export interface SessionDTOExt extends SessionDTO {
  triggerDisappear: WritableSignal<boolean>
  isBeingDeleted: boolean
}
