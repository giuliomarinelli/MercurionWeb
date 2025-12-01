import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum';
import { SercurityService } from './sercurity.service';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/app_modules/user/Models/entities/user.entity';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from 'src/metadata/metadata';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ScopeService {

    private readonly logger: MeiliContextLogger

    private readonly scopeValues = Object.values(Scope)

    private standardScopes: Scope[] = [
        Scope.UseInference,
        Scope.CreateMolecule,
        Scope.ViewMolecule,
        Scope.EditMolecule,
        Scope.DeleteMolecule,
        Scope.CreateCollection,
        Scope.ViewCollection,
        Scope.EditCollection,
        Scope.DeleteCollection,
        Scope.EditOwnProfile,
        Scope.DeleteOwnAccount,
        Scope.ManageMFA
    ]

    constructor(
        private readonly securityService: SercurityService,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        loggerFactory: MeiliLoggerService
    ) {
        this.logger = loggerFactory.forContext(ScopeService.name)
    }

    getEncryptedStandardScopes() {
        return this.encryptScopes(...this.standardScopes)
    }

    decryptScopes(...encryptedScopeVals: string[]): Scope[] {
        if (encryptedScopeVals.length === 0) {
            return []
        }
        return encryptedScopeVals.map((es) => this.securityService.decrypt_AES256(es))
            .filter((ds) => (this.scopeValues).includes(ds as Scope))
            .map((strScopeVal) => strScopeVal as Scope)
    }

    encryptScopes(...decryptedScopeVals: Scope[]): string[] {
        if (decryptedScopeVals.length === 0) {
            return []
        }
        return GeneralUtils.distinctArray(decryptedScopeVals).filter((ds) => this.scopeValues.includes(ds))
            .map((ds) => this.securityService.encrypt_AES256(ds))
    }

    async scopeVerificationLayer(userId: UUID, context: ExecutionContext, reflector: Reflector, jwtScpClaim: string): Promise<void> {
        const requiredScopes = reflector.getAllAndOverride<Scope[]>(SCOPES_KEY, [
            context.getHandler(),
            context.getClass()
        ])

        if (!requiredScopes || requiredScopes.length === 0) {
            return
        }

        const jwtScopes = this.generateScopesArrayFromJwtClaim(jwtScpClaim)

        const validFromDB = await this.verifyUserHasScopes(userId, ...requiredScopes)
        const validFromJwt = requiredScopes.every((scp) => jwtScopes.includes(scp))

        if (!validFromDB || !validFromJwt) {
            throw new RpcException('Forbidden::missing permissions')
        }
    }

    generateScopesArrayFromJwtClaim(rawScopes: string | undefined): Scope[] {
        if (!rawScopes) {
            return []
        }
        const parts = rawScopes.split(/\s+/).filter(Boolean)
        return parts
            .map((s) => GeneralUtils.getEnumValueFromStringKey(Scope, s) ?? '')
            .filter((s): s is Scope => this.scopeValues.includes(s as Scope))
    }

    private async verifyUserHasScopes(userId: UUID, ...scopes: Scope[]): Promise<boolean> {
        try {
            const { scopes: encScopes } = await this.userRepo.findOneOrFail({
                where:
                {
                    id: userId
                },
                select: {
                    scopes: true
                }
            })
            const decScopes = this.decryptScopes(...encScopes)
            for (const scp of scopes) {
                if (!decScopes.includes(scp)) {
                    return false
                }
            }
            return true
        } catch (e) {
            this.logger.warn(`Error in verifyUserHasScopes, userId=${userId}`, e as object)
            return false
        }
    }



}
