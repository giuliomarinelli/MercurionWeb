import { Injectable } from "@nestjs/common";
import { AuthIdentity } from "../models/entities/auth-identity.entity";
import { AuthProvider } from "../models/enums/auth-provider.enum";
import { SocialProviderRegistry } from "./social-provider-registry";
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from "src/logging/logger.port";
import { uuidv7 } from "@kripod/uuidv7";
import { UUID } from "crypto";
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { TokenType } from 'src/app_modules/auth/models/enums/token-type.enum';
import { ScopeService } from "src/app_modules/auth/services/scope.service";
import { OAuthStateService } from "src/app_modules/oauth2-client/services/oauth-state.service";

import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { UnitOfWork, transactionManager } from 'src/persistence/transaction-context'
import { UserService } from 'src/app_modules/user/services/user.service'
import { InitialWorkspaceService } from 'src/app_modules/molecule-collection/services/initial-workspace.service'
import { QueryFailedError } from 'typeorm'

@Injectable()
export class SocialAuthService {

    private readonly logger: LoggerContext

    constructor(
        private readonly providerRegistry: SocialProviderRegistry,
        private readonly unitOfWork: UnitOfWork,
        private readonly userService: UserService,
        private readonly initialWorkspace: InitialWorkspaceService,
        private readonly scopeService: ScopeService,
        private readonly jwtTools: JwtToolsService,
        private readonly oauthStateService: OAuthStateService,
        loggerFactory: LoggerPort
    ) {
        this.logger = loggerFactory.forContext(SocialAuthService.name)
    }

    async getOauth2TempState(provider: AuthProvider, redirectTo: string): Promise<string> {
        return this.oauthStateService.create({
            provider,
            purpose: 'sso-login',
            redirectTo,
        })
    }

    async consumeCallbackState(state: string, provider: AuthProvider) {
        return this.oauthStateService.consume(state, provider, 'sso-login')
    }

    getAuthorizationUrl(provider: AuthProvider, state: string) {
        return this.providerRegistry.get(provider).getAuthorizationUrl(state)
    }

    async loginWithProvider(provider: AuthProvider, code: string): Promise<string> {

        try {
            const client = this.providerRegistry.get(provider)
            const profile = await client.getProfileFromCode(code)
            let userId: UUID
            try {
                userId = await this.unitOfWork.run(async (context) => {
                    const manager = transactionManager(context)

                    // The database unique key is the authority for concurrent
                    // first callbacks; this lookup is only the fast path.
                    let identity = await manager.findOne(AuthIdentity, {
                        where: {
                            provider: profile.provider,
                            providerSubject: profile.subject
                        },
                        relations: {
                            user: true
                        }
                    })

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
                        await this.initialWorkspace.initializeForUser(user.id, context)
                    } else {
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
            } catch (error) {
                if (!(error instanceof QueryFailedError)) throw error

                // The losing transaction is aborted by PostgreSQL.  Re-read
                // in a fresh transaction and converge on the committed
                // provider+subject winner instead of leaking SQL details.
                userId = await this.unitOfWork.run(async context => {
                    const identity = await transactionManager(context).findOne(AuthIdentity, {
                        where: {
                            provider: profile.provider,
                            providerSubject: profile.subject
                        }
                    })
                    if (!identity) throw applicationError(ApplicationErrorCode.SSO_CALLBACK_FAILED)
                    return identity.userId
                })
            }
            return this.jwtTools.generateToken(userId, TokenType.SSO_PreAuthorizationToken)
        } catch (e) {
            this.logger.warn(' > loginWithProvider > Error: ', (e instanceof Error ? e.stack : e) as object)
            throw applicationError(ApplicationErrorCode.SSO_CALLBACK_FAILED)
        }

    }
}
