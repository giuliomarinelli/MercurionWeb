import { ISessionDeviceInfo } from "./fingerprint.dtos"

export interface EmailDTO {
  email: string
}

export interface Login_FirstStepDTO {
  email: string
  password: string
  remember: boolean
  sessionDeviceInfo?: ISessionDeviceInfo
}
