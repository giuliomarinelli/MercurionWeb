import { UUID } from "crypto";
import { AuthProvider } from "src/app_modules/sso/Models/enums/auth-provider.enum";

export interface ISession {
    sessionId: UUID
    userId: UUID
    deviceId: string
    createdAt: number
    expiresAt: number
    lastAccessedAt: number
    IP: string
    valid: boolean
    sessionDeviceInfo: ISessionDeviceInfo
    fingerprint: string
    location: string
    provider: AuthProvider
}

export interface ISessionDeviceInfo {
    osPlatform: string
    useragent: string
    browser: {
        name: string,
        version: string
    }
}

export type ISSO_SessionActivationData = Pick<ISession, 'IP' | 'fingerprint' | 'sessionDeviceInfo' | 'location' | 'deviceId'>
