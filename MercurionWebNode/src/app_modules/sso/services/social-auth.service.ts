import { Injectable } from "@nestjs/common";
import { User } from "src/app_modules/user/Models/entities/user.entity";
import { DataSource, EntityManager } from "typeorm";
import { AuthIdentity } from "../Models/entities/auth-identity.entity";
import { AuthProvider } from "../Models/enums/auth-provider.enum";
import { SocialProviderRegistry } from "./social-provider-registry";
import { MeiliLoggerService } from "src/app_modules/meilisearch/services/meili-logger.service";
import { MeiliContextLogger } from "src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface";
import { uuidv7 } from "@kripod/uuidv7";
import { createHmac, randomBytes, UUID } from "crypto";
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { TokenType } from 'src/app_modules/auth/Models/enums/token-type.enum';
import { ScopeService } from "src/app_modules/auth/services/scope.service";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "src/app_modules/redis/services/redis.service";
import { RpcException } from "@nestjs/microservices";

@Injectable()
export class SocialAuthService {

    private readonly logger: MeiliContextLogger

    private readonly redisIdHmacSecret: string

    constructor(
        private readonly providerRegistry: SocialProviderRegistry,
        private readonly dataSource: DataSource,
        private readonly scopeService: ScopeService,
        private readonly jwtTools: JwtToolsService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        loggerFactory: MeiliLoggerService
    ) {
        this.logger = loggerFactory.forContext(SocialAuthService.name)
        this.redisIdHmacSecret = this.configService.get<string>('App.redisIdHmacSecret')!
    }

    private hmacKey(raw: string): string {
        return createHmac('sha256', this.redisIdHmacSecret)
            .update(raw, 'utf8')
            .digest('hex')
    }

    private getStateKey(rawState: string, provider: AuthProvider): string {
        const hashed = this.hmacKey(rawState)
        return `oauth2:state:${provider}:${hashed}`
    }

    private generateOAuth2CsrfState(): string {
        return randomBytes(32).toString('base64url')
    }

    async getOauth2TempState(provider: AuthProvider): Promise<string> {
        const state = this.generateOAuth2CsrfState()
        const key = this.getStateKey(state, provider)
        await this.redisService.set(key, '1', 240)
        return state
    }

    async validateCallbackState(state: string, provider: AuthProvider): Promise<boolean> {
        if (!state) {
            return false
        }
        const key = this.getStateKey(state, provider)
        const ok = (await this.redisService.get(key) === '1')
        if (ok) {
            await this.redisService.del(key)
        }
        return ok
    }

    getAuthorizationUrl(provider: AuthProvider, state: string) {
        return this.providerRegistry.get(provider).getAuthorizationUrl(state)
    }

    async loginWithProvider(provider: AuthProvider, code: string): Promise<string> {

        try {
            return this.dataSource.manager.transaction(async (manager: EntityManager) => {

                const client = this.providerRegistry.get(provider)
                const profile = await client.getProfileFromCode(code)

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
                    const user = manager.create(User, {
                        id: uuidv7() as UUID,
                        sso: true,
                        firstName: profile.firstName ? profile.firstName.charAt(0).toUpperCase() + profile.firstName.slice(1) : '',
                        lastName: profile.lastName ? profile.lastName.charAt(0).toUpperCase() + profile.lastName.slice(1) : '',
                        isVerified: true,
                        scopes: this.scopeService.getEncryptedStandardScopes(),
                        initials: `${profile.firstName?.charAt(0).toUpperCase() || 'U'}${profile.lastName?.charAt(0).toUpperCase() || 'U'}`,
                    })

                    await manager.save(user)

                    identity = manager.create(AuthIdentity, {
                        id: uuidv7() as UUID,
                        userId: user.id,
                        provider: profile.provider,
                        providerSubject: profile.subject,
                        email: profile.email,
                        emailVerified: profile.emailVerified
                    })

                    await manager.save(identity)
                    identity.user = user

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

                const sso_preAuthorizationToken = await this.jwtTools.generateToken(identity.userId, TokenType.SSO_PreAuthorizationToken)

                return sso_preAuthorizationToken
            })
        } catch (e) {
            this.logger.warn(' > loginWithProvider > Error: ', (e.stack ?? e) as object)
            throw new RpcException('SSO_Unauthorized::failed callback flow')
        }

    }
}
