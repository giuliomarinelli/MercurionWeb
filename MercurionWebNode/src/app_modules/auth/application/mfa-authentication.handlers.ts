import { Injectable } from '@nestjs/common'
import { UUID } from 'crypto'
import type { FingerprintData } from '@mercurion/rest-contracts'

import { RedisService } from 'src/app_modules/redis/services/redis.service'
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface'
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service'
import { UserService } from 'src/app_modules/user/services/user.service'
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum'
import {
    ApplicationErrorCode,
    applicationHttpException
} from 'src/exception-handling/application-error'
import { GeneralUtils } from 'src/utils/general-utils/general-utils'
import { TypeGuards } from 'src/utils/type-guards/type-guards'

import { BackupCodeDTO } from '../Models/DTO/backup-code.cls.dto'
import { TotpBodyDTO } from '../Models/DTO/totp.cls.dto'
import { VerifyBodyDTO } from '../Models/DTO/verify-body.cls.dto.'
import { TokenType } from '../Models/enums/token-type.enum'
import { VerifyKind } from '../Models/enums/verify-kind.enum'
import { JwtToolsService } from '../services/jwt-tools.service'
import { MfaService } from '../services/mfa.service'
import { SercurityService } from '../services/sercurity.service'
import { SessionService } from '../services/session.service'
import { AuthenticationSessionService } from './authentication-session.service'

export interface StartMfaChallengeCommand {
    preAuthorizationToken: string
    strategyKey: string
    trustVerify: boolean
}

export type StartMfaChallengeResult =
    | {
        outcome: 'sent'
        strategy: MfaStrategy
        generatedAt: number
        expiresAt: number
    }
    | { outcome: 'invalid-token' }
    | { outcome: 'invalid-strategy' }

@Injectable()
export class StartMfaChallengeHandler {
    constructor(
        private readonly jwtTools: JwtToolsService,
        private readonly mfaService: MfaService
    ) { }

    public async execute(
        command: StartMfaChallengeCommand
    ): Promise<StartMfaChallengeResult> {
        try {
            await this.jwtTools.verifyTokenAndGetPayload(
                command.preAuthorizationToken,
                TokenType.PreAuthorizationToken
            )
        } catch {
            return { outcome: 'invalid-token' }
        }

        const strategy = GeneralUtils.getEnumValueFromStringKey(
            MfaStrategy,
            command.strategyKey
        )
        if (!strategy || strategy === MfaStrategy.APP_TOTP) {
            return { outcome: 'invalid-strategy' }
        }

        return {
            outcome: 'sent',
            strategy,
            ...await this.mfaService.sendOtpToUser(
                command.preAuthorizationToken,
                strategy,
                command.trustVerify
            )
        }
    }
}

export interface CompleteMfaLoginCommand {
    preAuthorizationToken: string
    strategyKey: string
    trustVerify: boolean
    body: VerifyBodyDTO
    fingerprintData: FingerprintData
    ip: string
    actualDeviceId: UUID
    loginPendingValue: string
}

export type CompleteMfaLoginResult =
    | {
        outcome: 'authenticated'
        accessToken: string
        ws_accessToken: string
        initials: string
        signedDeviceId: string
        persistLogin: boolean
    }
    | { outcome: 'invalid-strategy' }

@Injectable()
export class CompleteMfaLoginHandler {
    private readonly logger: MeiliContextLogger

    constructor(
        private readonly jwtTools: JwtToolsService,
        private readonly mfaService: MfaService,
        private readonly sessionService: SessionService,
        private readonly redisService: RedisService,
        private readonly userService: UserService,
        private readonly securityService: SercurityService,
        private readonly authenticationSession: AuthenticationSessionService,
        loggerFactory: MeiliLoggerService
    ) {
        this.logger = loggerFactory.forContext(CompleteMfaLoginHandler.name)
    }

    public async execute(
        command: CompleteMfaLoginCommand
    ): Promise<CompleteMfaLoginResult> {
        let persistLogin = command.loginPendingValue === 'pending_long'
        let userId: UUID
        let sessionId: UUID
        let jti: UUID

        try {
            ({ sub: userId, sid: sessionId, jti } =
                await this.jwtTools.verifyTokenAndGetPayload(
                    command.preAuthorizationToken,
                    TokenType.PreAuthorizationToken
                ))
        } catch {
            try {
                await this.jwtTools.verifyTokenAndGetPayload(
                    command.preAuthorizationToken,
                    TokenType.PreAuthorizationToken,
                    true
                )
                throw applicationHttpException(
                    ApplicationErrorCode.MFA_PREAUTHORIZATION_EXPIRED
                )
            } catch (error) {
                this.logger.warn(
                    ` > execute > Error: ${(error as { message?: string })?.message || error}`
                )
                throw applicationHttpException(
                    ApplicationErrorCode.MFA_PREAUTHORIZATION_INVALID
                )
            }
        }

        if (!persistLogin) {
            persistLogin = await this.sessionService.isSessionLongTerm(
                sessionId,
                userId
            )
        }

        const expectedDeviceId = await this.redisService.get(`mfa:pat:dev:${jti}`)
        if (expectedDeviceId && expectedDeviceId !== command.actualDeviceId) {
            await this.sessionService.revokeToken(jti)
            throw applicationHttpException(ApplicationErrorCode.MFA_DEVICE_MISMATCH)
        }

        let code: string
        if (command.body.kind === VerifyKind.TOTP) {
            code = (command.body.payload as TotpBodyDTO).totp
        } else if (command.body.kind === VerifyKind.BACKUP) {
            code = (command.body.payload as BackupCodeDTO).code
        } else {
            throw applicationHttpException(ApplicationErrorCode.PERMISSION_DENIED)
        }

        const strategy = GeneralUtils.getEnumValueFromStringKey(
            MfaStrategy,
            command.strategyKey
        )
        if (!TypeGuards.isMfaStrategy(strategy)) {
            return { outcome: 'invalid-strategy' }
        }

        const verified = strategy !== MfaStrategy.BACKUP_CODE
            ? await this.mfaService.verifyUserOtpOrAppTotp(
                code,
                command.preAuthorizationToken,
                strategy
            )
            : await this.mfaService.verifyBackupCode(
                code,
                command.preAuthorizationToken
            )
        if (!verified) {
            throw applicationHttpException(ApplicationErrorCode.MFA_CODE_INVALID)
        }

        return {
            outcome: 'authenticated',
            ...await this.authenticationSession.completeAuthenticatedSession(
                userId,
                sessionId,
                command.fingerprintData,
                command.ip,
                command.trustVerify
            ),
            initials: await this.userService.getUserInitialsByUserId(userId) ?? '',
            signedDeviceId: this.securityService.signDeviceId(command.actualDeviceId),
            persistLogin
        }
    }
}
