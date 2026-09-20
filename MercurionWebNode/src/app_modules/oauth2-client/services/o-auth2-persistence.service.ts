import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { OAuth2TokenEntity } from '../models/entities/oauth2-token.entity';
import { UUID } from 'crypto';
import { ProviderCredentialCipherService } from './provider-credential-cipher.service';

interface OAuthTokenCreateCommand {
    provider: string
    refreshToken: string
    userId: UUID | null
    scope?: string
}

@Injectable()
export class OAuth2PersistenceService {
    constructor(
        @InjectRepository(OAuth2TokenEntity)
        private readonly tokenRepo: Repository<OAuth2TokenEntity>,
        private readonly cipher: ProviderCredentialCipherService,
    ) {}

    private normalizeProvider(provider: string): string {
        const normalized = provider.trim().toLowerCase()
        if (!normalized) throw new Error('OAuth provider is required')
        return normalized
    }

    private ownerScope(userId?: UUID): string {
        return userId ?? '__application__'
    }

    async saveRefreshToken(provider: string, refreshToken: string, userId?: UUID, scope?: string): Promise<void> {
        provider = this.normalizeProvider(provider)
        // TypeORM richiede IsNull() esplicito per i campi nullable
        const where = userId === undefined || userId === null
            ? { provider, userId: IsNull() }
            : { provider, userId };

        const existing = await this.tokenRepo.findOne({
            where,
            select: { id: true, provider: true, userId: true, refreshToken: true, scope: true },
        });

        const encryptedRefreshToken = this.cipher.encrypt(
            refreshToken,
            provider,
            this.ownerScope(userId),
        )

        if (existing) {
            existing.refreshToken = encryptedRefreshToken;
            if (scope) existing.scope = scope;
            existing.updatedAt = Date.now();
            await this.tokenRepo.save(existing);
        } else {
            const record: OAuthTokenCreateCommand = {
                provider,
                refreshToken: encryptedRefreshToken,
                userId: userId ?? null,
            };
            if (scope) record.scope = scope;
            await this.tokenRepo.save(this.tokenRepo.create(record));
        }
    }

    async getRefreshToken(provider: string, userId?: UUID): Promise<string | null> {
        provider = this.normalizeProvider(provider)
        const where = userId === undefined || userId === null
            ? { provider, userId: IsNull() }
            : { provider, userId };

        const token = await this.tokenRepo.findOne({
            where,
            select: { id: true, provider: true, userId: true, refreshToken: true },
        });
        if (!token) return null

        if (!this.cipher.isEncrypted(token.refreshToken)) {
            const legacyToken = token.refreshToken
            await this.saveRefreshToken(provider, legacyToken, userId)
            return legacyToken
        }

        return this.cipher.decrypt(token.refreshToken, provider, this.ownerScope(userId));
    }

    async deleteCredentials(provider: string, userId?: UUID): Promise<void> {
        provider = this.normalizeProvider(provider)
        const where = userId === undefined || userId === null
            ? { provider, userId: IsNull() }
            : { provider, userId }
        await this.tokenRepo.delete(where)
    }
}
