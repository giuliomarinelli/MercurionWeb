import type {
  FingerprintData,
  SessionDeviceInfo
} from '@mercurion/rest-contracts'

export type {
  FingerprintData
} from '@mercurion/rest-contracts'

export type FingerprintDataWrapper = {
  fingerprintDataEnc: string
  sessionDeviceInfo: SessionDeviceInfo
}
