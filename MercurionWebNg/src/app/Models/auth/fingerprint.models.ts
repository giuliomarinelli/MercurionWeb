import type { SessionDeviceInfo } from '@mercurion/rest-contracts'

export type {
  FingerprintData,
  SessionDeviceInfo as ISessionDeviceInfo
} from '@mercurion/rest-contracts'

export interface FingerprintDataWrapper {
  fingerprintDataEnc: string
  sessionDeviceInfo: SessionDeviceInfo
}
