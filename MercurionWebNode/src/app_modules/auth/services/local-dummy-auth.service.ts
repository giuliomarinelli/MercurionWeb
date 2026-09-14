import { Injectable, type OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import {
  LOCAL_DUMMY_AUTH,
  type FingerprintData,
  type SessionDeviceInfo
} from '@mercurion/rest-contracts'
import { createHash, type UUID } from 'crypto'
import type { FastifyRequest } from 'fastify'
import type { Repository } from 'typeorm'

import { TokenType } from 'src/app_modules/auth/Models/enums/token-type.enum'
import { AuthProvider } from 'src/app_modules/sso/Models/enums/auth-provider.enum'
import { User } from 'src/app_modules/user/Models/entities/user.entity'
import { UserGender } from 'src/app_modules/user/Models/enums/user-gender.enum'
import { Environment } from 'src/config/config.schema'
import type { AppConfiguration } from 'src/config/config.types'

import { JwtToolsService } from './jwt-tools.service'
import { ScopeService } from './scope.service'
import { SessionService } from './session.service'

/** @deprecated Autonomous workers use the existing shared real test account. */
@Injectable()
export class LocalDummyAuthService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly scopeService: ScopeService,
    private readonly sessionService: SessionService,
    private readonly jwtTools: JwtToolsService,
    private readonly configService: ConfigService
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.isEnabled()) return

    const id = LOCAL_DUMMY_AUTH.userId as UUID
    const existing = await this.userRepo.findOne({
      where: { id },
      select: { id: true }
    })
    if (existing) return

    const now = Date.now()
    await this.userRepo.createQueryBuilder()
      .insert()
      .into(User)
      .values({
        id,
        email: LOCAL_DUMMY_AUTH.email,
        unconfirmedEmail: null,
        completePhoneNumber: null,
        phoneNumberPrefixLength: 0,
        unconfirmedPhoneNumber: null,
        unconfirmedPhoneNumberPrefixLength: null,
        passwordHash: null,
        firstName: LOCAL_DUMMY_AUTH.firstName,
        lastName: LOCAL_DUMMY_AUTH.lastName,
        gender: UserGender.Undefined,
        job: 'Local development fixture',
        initials: LOCAL_DUMMY_AUTH.initials,
        isVerified: true,
        scopes: this.scopeService.getEncryptedStandardScopes(),
        mfaStrategies: '[]',
        createdAt: now,
        updatedAt: now,
        otpSecret: '',
        appTotpSecret: null,
        oldPasswordHashes: [],
        avatarId: null,
        backupCodesGiven: false,
        accountRecoveryCodeHash: null,
        locked: false,
        recoveryMode: false,
        sso: false
      })
      .orIgnore()
      .callListeners(false)
      .execute()
  }

  isEnabled(): boolean {
    const appConfiguration =
      this.configService.getOrThrow<AppConfiguration>('App')
    return appConfiguration.env === Environment.Development &&
      appConfiguration.localDummyAuth
  }

  acceptsActivationRequest(request: Pick<FastifyRequest, 'headers'>): boolean {
    const marker = this.firstHeader(request.headers[LOCAL_DUMMY_AUTH.headerName.toLowerCase()])
    return this.isEnabled() &&
      marker === LOCAL_DUMMY_AUTH.marker &&
      this.isCanonicalBrowserRequest(request.headers)
  }

  async createAuthenticatedSession(
    deviceId: UUID,
    IP: string,
    sessionDeviceInfo: SessionDeviceInfo,
    fingerprintData: FingerprintData
  ): Promise<{ accessToken: string; ws_accessToken: string; sessionId: UUID }> {
    const userId = LOCAL_DUMMY_AUTH.userId as UUID
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(fingerprintData).toLocaleLowerCase())
      .digest('hex')
    const session = await this.sessionService.createSession({
      deviceId,
      userId,
      IP,
      sessionDeviceInfo,
      fingerprint,
      location: 'Local development',
      provider: AuthProvider.Mercurion
    }, true)
    await this.sessionService.activateSession(session.sessionId, userId)

    return {
      sessionId: session.sessionId,
      accessToken: await this.jwtTools.generateToken(userId, TokenType.AccessToken, session.sessionId),
      ws_accessToken: await this.jwtTools.generateToken(userId, TokenType.ws_AccessToken, session.sessionId)
    }
  }

  private isCanonicalBrowserRequest(
    headers: Record<string, string | string[] | undefined>
  ): boolean {
    const host = this.firstHeader(headers['host'])?.toLowerCase()
    const origin = this.firstHeader(headers['origin'])
    const referer = this.firstHeader(headers['referer'])
    const fetchSite = this.firstHeader(headers['sec-fetch-site'])?.toLowerCase()
    const canonical = LOCAL_DUMMY_AUTH.canonicalOrigin
    return (host === 'localhost' || host === 'localhost:8888') &&
      (origin === canonical ||
        referer === canonical ||
        referer?.startsWith(`${canonical}/`) === true ||
        fetchSite === 'same-origin')
  }

  private firstHeader(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value
  }
}
