import { Injectable } from '@nestjs/common'
import type { SessionDeviceInfo } from '@mercurion/rest-contracts'
import type { UUID } from 'crypto'
import { AuthProvider } from 'src/app_modules/sso/Models/enums/auth-provider.enum'
import { TypeGuards } from 'src/utils/type-guards/type-guards'
import type { ISession } from '../Models/interfaces/i-session.interface'

interface SessionRecord extends Record<string, string> {
    sessionId: string
    userId: string
    deviceId: string
    expiresAt: string
    lastAccessedAt: string
    IP: string
    valid: string
    longTerm: string
    sessionDeviceInfo: string
    fingerprint: string
    location: string
    createdAt: string
    provider: string
}

@Injectable()
export class SessionRedisCodec {

    public encode(session: ISession, longTerm: boolean): SessionRecord {
        return {
            sessionId: session.sessionId,
            userId: session.userId,
            deviceId: session.deviceId,
            expiresAt: session.expiresAt.toString(),
            lastAccessedAt: session.lastAccessedAt.toString(),
            IP: session.IP,
            valid: session.valid.toString(),
            longTerm: longTerm.toString(),
            sessionDeviceInfo: JSON.stringify(session.sessionDeviceInfo),
            fingerprint: session.fingerprint,
            location: session.location,
            createdAt: session.createdAt.toString(),
            provider: session.provider.toString()
        }
    }

    public decode(record: Record<string, string>): ISession | null {
        if (Object.keys(record).length === 0) {
            return null
        }

        try {
            return {
                sessionId: record.sessionId as UUID,
                userId: record.userId as UUID,
                deviceId: record.deviceId,
                createdAt: parseInt(record.createdAt, 10),
                expiresAt: parseInt(record.expiresAt, 10),
                lastAccessedAt: parseInt(record.lastAccessedAt, 10),
                IP: record.IP,
                valid: JSON.parse(record.valid) as boolean,
                sessionDeviceInfo: JSON.parse(record.sessionDeviceInfo) as SessionDeviceInfo,
                fingerprint: record.fingerprint,
                location: record.location,
                provider: TypeGuards.isAuthProvider(record.provider)
                    ? record.provider
                    : AuthProvider.Mercurion
            }
        } catch {
            return null
        }
    }
}
