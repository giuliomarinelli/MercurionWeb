import { Injectable } from "@nestjs/common";
import { AuthIdentity } from "../models/entities/auth-identity.entity";
import { AuthProvider } from "../models/enums/auth-provider.enum";
import { SocialProviderRegistry } from "./social-provider-registry";
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from "src/logging/logger.port";
import { uuidv7 } from "@kripod/uuidv7";
import { createHmac, randomBytes, UUID } from "crypto";
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { TokenType } from 'src/app_modules/auth/models/enums/token-type.enum';
import { ScopeService } from "src/app_modules/auth/services/scope.service";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "src/app_modules/redis/services/redis.service";

import { SecurityService } from "src/app_modules/auth/services/security.service";
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { redisDurations, redisKeys } from 'src/app_modules/redis/contracts/redis-contracts'
import { UnitOfWork, transactionManager } from 'src/persistence/transaction-context'
import { UserService } from 'src/app_modules/user/services/user.service'
import { InitialWorkspaceService } from 'src/app_modules/molecule-collection/services/initial-workspace.service'

@Injectable()
export class SocialAuthService {

    private readonly logger: LoggerContext

    private readonly redisIdHmacSecret: string

    constructor(
        private readonly providerRegistry: SocialProviderRegistry,
        private readonly unitOfWork: UnitOfWork,
        private readonly userService: UserService,
        private readonly initialWorkspace: InitialWorkspaceService,
        private readonly scopeService: ScopeService,
        private readonly jwtTools: JwtToolsService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly securityService: SecurityService,
        loggerFactory: LoggerPort
    ) {
        this.logger = loggerFactory.forContext(SocialAuthService.name)
        this.redisIdHmacSecret = this.configService.get<string>('App.redisIdHmacSecret')!
    }

    private hmacKey(raw: string): string {
        return createHmac('sha256', this.redisIdHmacSecret)
            .update(raw, 'utf8')
            .digest('hex')
    }

    private getStateKey(rawState: string, provider: AuthProvider) {
        const hashed = this.hmacKey(rawState)
        return redisKeys.sso.state(provider, hashed)
    }

    private generateOAuth2CsrfState(): string {
        return randomBytes(32).toString('base64url')
    }

    async getOauth2TempState(provider: AuthProvider, redirectTo: string): Promise<string> {
        const state = this.generateOAuth2CsrfState()
        const key = this.getStateKey(state, provider)
        const val = this.securityService.encrypt_AES256(redirectTo)
        await this.redisService.set(key, val, redisDurations.seconds(240))
        return state
    }

    async validateCallbackState(state: string, provider: AuthProvider): Promise<boolean> {
        if (!state) {
            return false
        }
        const key = this.getStateKey(state, provider)
        const ok = (await this.redisService.get(key)) != null
        return ok
    }

    async retrieveRedirectTo(state: string, provider: AuthProvider): Promise<string> {
        const key = this.getStateKey(state, provider)
        const val = await this.redisService.get(key)
        let result = ''
        if (!!val && typeof val === 'string') {
            result = this.securityService.decrypt_AES256(val)
        }
        return result
    }

    getAuthorizationUrl(provider: AuthProvider, state: string) {
        return this.providerRegistry.get(provider).getAuthorizationUrl(state)
    }

    async loginWithProvider(provider: AuthProvider, code: string): Promise<string> {

        try {
            const client = this.providerRegistry.get(provider)
            const profile = await client.getProfileFromCode(code)
            const userId = await this.unitOfWork.run(async (context) => {
                const manager = transactionManager(context)

                // 1) ricerca identity
                let identity = await manager.findOne(AuthIdentity, {
                    where: {
                        provider: profile.provider,
                        providerSubject: profile.subject
                    },
                    relations: {
                        user: true
                    }
                })

                // 2) se non esiste, creazione user + identity
                if (!identity) {
                    const user = await this.userService.createSsoUser({
                        id: uuidv7() as UUID,
                        firstName: profile.firstName ? profile.firstName.charAt(0).toUpperCase() + profile.firstName.slice(1) : '',
                        lastName: profile.lastName ? profile.lastName.charAt(0).toUpperCase() + profile.lastName.slice(1) : '',
                        scopes: this.scopeService.getEncryptedStandardScopes(),
                        initials: `${profile.firstName?.charAt(0).toUpperCase() || 'U'}${profile.lastName?.charAt(0).toUpperCase() || 'U'}`,
                    }, context)

                    identity = manager.create(AuthIdentity, {
                        id: uuidv7() as UUID,
                        userId: user.id,
                        provider: profile.provider,
                        providerSubject: profile.subject,
                        email: profile.email,
                        emailVerified: profile.emailVerified
                    })

                    await manager.save(identity)

                    const userId = user.id

                    await this.initialWorkspace.createForUser(userId, context)

                } else {

                    // opzionale: syncare email/verified se cambia
                    const needsUpdate = identity.email !== profile.email || identity.emailVerified !== profile.emailVerified

                    if (needsUpdate) {
                        identity.email = profile.email
                        identity.emailVerified = profile.emailVerified
                        identity.updatedAt = Date.now()
                        await manager.save(identity)
                    }
                }

                return identity.userId
            })
            return this.jwtTools.generateToken(userId, TokenType.SSO_PreAuthorizationToken)
        } catch (e) {
            this.logger.warn(' > loginWithProvider > Error: ', (e instanceof Error ? e.stack : e) as object)
            throw applicationError(ApplicationErrorCode.SSO_CALLBACK_FAILED)
        }

    }
}
