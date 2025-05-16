import { ISessionDeviceInfo } from "./fingerprint.dtos"

export interface EmailDTO {
  email: string
}

export interface Login_FirstStepDTO {
  email: string
  password: string
  remember: boolean
}

export type Login_FirstStepWrapper = Login_FirstStepDTO & {
  fingerprintBase64: string
  sessionDeviceInfo: ISessionDeviceInfo
  turnstileToken: string
}

