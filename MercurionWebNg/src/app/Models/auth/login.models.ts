import type { Login_FirstStepDTO, SessionDeviceInfo } from '@mercurion/rest-contracts'

export type {
  EmailDTO,
  Login_FirstStepDTO,
  SignedSessionIdDTO
} from '@mercurion/rest-contracts'

export type Login_FirstStepWrapper = Login_FirstStepDTO & {
  fingerprintBase64: string
  sessionDeviceInfo: SessionDeviceInfo
  turnstileToken: string
}
