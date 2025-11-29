import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/app_modules/user/Models/entities/user.entity";
import { DataSource, EntityManager, Repository } from "typeorm";
import { AuthIdentity } from "../Models/entities/auth-identity.entity";
import { AuthProvider } from "../Models/enums/auth-provider.enum";
import { SocialProviderRegistry } from "./social-provider-registry";
import { MeiliLoggerService } from "src/app_modules/meilisearch/services/meili-logger.service";
import { MeiliContextLogger } from "src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface";
import { uuidv7 } from "@kripod/uuidv7";
import { UUID } from "crypto";
import { SessionService } from "src/app_modules/auth/services/session.service";
import { GeoIpService } from "src/app_modules/auth/services/geo-ip.service";
import { SSO_AuthData } from '../Models/interfaces/sso-auth-data.interface';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { TokenType } from 'src/app_modules/auth/Models/enums/token-type.enum';

@Injectable()
export class SocialAuthService {

    private readonly logger: MeiliContextLogger

    constructor(        
        private readonly providerRegistry: SocialProviderRegistry,
        private readonly dataSource: DataSource,
        private readonly sessionService: SessionService,
        private readonly geoIpService: GeoIpService,
        private readonly jwtTools: JwtToolsService,
        loggerFactory: MeiliLoggerService
    ) {
        this.logger = loggerFactory.forContext(SocialAuthService.name)
    }

    getAuthorizationUrl(provider: AuthProvider, state: string) {
        return this.providerRegistry.get(provider).getAuthorizationUrl(state);
    }

    async loginWithProvider(provider: AuthProvider, code: string, ip: string, deviceId: string): Promise<SSO_AuthData> {

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
                    passwordHash: null,
                    firstName: profile.firstName ?? '',
                    lastName: profile.lastName ?? '',
                    isVerified: profile.emailVerified
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

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { latitude: _omit, longitude: __omit, ip: ___omit, city, region, country } = this.geoIpService.getLocation(ip)

            const location = [city, region, country].filter((el) => !!el).join(', ')

            // 3) Inizio flusso auth Mercurion
            const { sessionId } = await this.sessionService.createSession({
                deviceId,
                fingerprint: provider,
                IP: ip,
                location,
                sessionDeviceInfo: {
                    osPlatform: "",
                    useragent: "",
                    browser: {
                        name: "",
                        version: ""
                    }
                },
                userId: identity.userId
            }, true)

            await this.sessionService.activateSession(sessionId, identity.userId)

            const accessToken = await this.jwtTools.generateToken(identity.userId, TokenType.AccessToken, sessionId)
            const ws_accessToken = await this.jwtTools.generateToken(identity.userId, TokenType.ws_AccessToken, sessionId)

            return {
                accessToken,
                ws_accessToken,
                sessionId
            }
        })

    }
}
