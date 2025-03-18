import { UUID } from "crypto";

export interface ISession {
    sessionId: UUID
    userId: UUID
    deviceId: string
    expiresAt: number
    lastAccessedAt: number
    IP: string
    valid: boolean
    sessionDeviceInfo: ISessionDeviceInfo
}

export interface ISessionDeviceInfo {
    osPlatform: string
    useragent: string
    browser: {
        name: string,
        version: string
    }
}
