import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuth2TokenEntity } from '../Models/entities/oauth2-token.entity';
import { UUID } from 'crypto';

@Injectable()
export class OAuth2PersistenceService {
    constructor(
        @InjectRepository(OAuth2TokenEntity)
        private readonly tokenRepo: Repository<OAuth2TokenEntity>,
    ) { }

    async saveRefreshToken(provider: string, refreshToken: string, userId?: UUID, scope?: string): Promise<void> {
        const existing = await this.tokenRepo.findOne({ where: { provider, userId } })
        if (existing) {
            existing.refreshToken = refreshToken;
            if (scope) existing.scope = scope;
            await this.tokenRepo.save(existing);
        } else {
            await this.tokenRepo.save(this.tokenRepo.create({ provider, refreshToken, userId: userId ?? null, scope: scope ?? null }));
        }
    }

    async getRefreshToken(provider: string, userId?: UUID): Promise<string | null> {
        const token = await this.tokenRepo.findOne({ where: { provider, userId } })
        return token ? token.refreshToken : null
    }
}
