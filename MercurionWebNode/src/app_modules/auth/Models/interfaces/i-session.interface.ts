import { UUID } from "crypto";
import { AuthProvider } from "src/app_modules/sso/Models/enums/auth-provider.enum";
import type { SessionDeviceInfo } from '@mercurion/rest-contracts'

export interface ISession {
    sessionId: UUID
    userId: UUID
    deviceId: string
    createdAt: number
    expiresAt: number
    lastAccessedAt: number
    IP: string
    valid: boolean
    sessionDeviceInfo: SessionDeviceInfo
    fingerprint: string
    location: string
    provider: AuthProvider
}

export type ISessionDeviceInfo = SessionDeviceInfo

export type ISSO_SessionActivationData = Pick<ISession, 'IP' | 'fingerprint' | 'sessionDeviceInfo' | 'location' | 'deviceId'>
