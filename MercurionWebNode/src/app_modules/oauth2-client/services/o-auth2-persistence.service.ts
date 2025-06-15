import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { OAuth2TokenEntity } from '../Models/entities/oauth2-token.entity';
import { UUID } from 'crypto';

@Injectable()
export class OAuth2PersistenceService {
    constructor(
        @InjectRepository(OAuth2TokenEntity)
        private readonly tokenRepo: Repository<OAuth2TokenEntity>,
    ) {}

    async saveRefreshToken(provider: string, refreshToken: string, userId?: UUID, scope?: string): Promise<void> {
        // TypeORM richiede IsNull() esplicito per i campi nullable
        const where = userId === undefined || userId === null
            ? { provider, userId: IsNull() }
            : { provider, userId };

        const existing = await this.tokenRepo.findOne({ where });

        if (existing) {
            existing.refreshToken = refreshToken;
            if (scope) existing.scope = scope;
            await this.tokenRepo.save(existing);
        } else {
            const record: Partial<OAuth2TokenEntity> = {
                provider,
                refreshToken,
                userId: userId ?? null,
            };
            if (scope) record.scope = scope;
            await this.tokenRepo.save(this.tokenRepo.create(record));
        }
    }

    async getRefreshToken(provider: string, userId?: UUID): Promise<string | null> {
        const where = userId === undefined || userId === null
            ? { provider, userId: IsNull() }
            : { provider, userId };

        const token = await this.tokenRepo.findOne({ where });
        return token ? token.refreshToken : null;
    }
}
