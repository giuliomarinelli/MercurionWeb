import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, randomBytes } from 'crypto'
import { RedisService } from 'src/app_modules/redis/services/redis.service'
import { redisDurations, redisKeys } from 'src/app_modules/redis/contracts/redis-contracts'

export type OAuthStatePurpose = 'sso-login' | 'oauth2-connect'

export interface OAuthStateRecord {
    readonly version: 1
    readonly provider: string
    readonly purpose: OAuthStatePurpose
    readonly createdAt: number
    readonly expiresAt: number
    readonly redirectTo?: string
    readonly ownerUserId?: string
    readonly sessionId?: string
}

export interface CreateOAuthStateInput {
    readonly provider: string
    readonly purpose: OAuthStatePurpose
    readonly redirectTo?: string
    readonly ownerUserId?: string
    readonly sessionId?: string
}

@Injectable()
export class OAuthStateService {
    private static readonly TTL_SECONDS = 240

    private readonly hmacSecret: string

    constructor(
        private readonly redisService: RedisService,
        configService: ConfigService,
    ) {
        this.hmacSecret = configService.get<string>('App.redisIdHmacSecret') ?? ''
    }

    async create(input: CreateOAuthStateInput): Promise<string> {
        const state = randomBytes(32).toString('base64url')
        const now = Date.now()
        const record: OAuthStateRecord = {
            version: 1,
            provider: input.provider,
            purpose: input.purpose,
            createdAt: now,
            expiresAt: now + OAuthStateService.TTL_SECONDS * 1000,
            ...(input.redirectTo === undefined ? {} : { redirectTo: input.redirectTo }),
            ...(input.ownerUserId === undefined ? {} : { ownerUserId: input.ownerUserId }),
            ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
        }

        await this.redisService.set(
            this.stateKey(state, input.provider),
            JSON.stringify(record),
            redisDurations.seconds(OAuthStateService.TTL_SECONDS),
        )
        return state
    }

    async consume(
        state: string,
        provider: string,
        purpose: OAuthStatePurpose,
    ): Promise<OAuthStateRecord | null> {
        if (!state) return null

        const rawRecord = await this.redisService.getAndDelete(
            this.stateKey(state, provider),
        )
        if (!rawRecord) return null

        let record: OAuthStateRecord
        try {
            const parsed: unknown = JSON.parse(rawRecord)
            if (!parsed || typeof parsed !== 'object') return null
            record = parsed as OAuthStateRecord
        } catch {
            return null
        }

        const now = Date.now()
        if (
            record.version !== 1 ||
            record.provider !== provider ||
            record.purpose !== purpose ||
            !Number.isInteger(record.createdAt) ||
            !Number.isInteger(record.expiresAt) ||
            record.createdAt > now ||
            record.expiresAt <= record.createdAt ||
            record.expiresAt <= now
        ) {
            return null
        }

        return record
    }

    private stateKey(state: string, provider: string) {
        const digest = createHmac('sha256', this.hmacSecret)
            .update(state, 'utf8')
            .digest('hex')
        return redisKeys.oauth.state(provider, digest)
    }
}
