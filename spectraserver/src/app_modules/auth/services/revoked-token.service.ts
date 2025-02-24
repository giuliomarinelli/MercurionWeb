import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { RedisService } from 'src/app_modules/redis/services/redis.service';


@Injectable()
export class RevokedTokenService {

    constructor(private readonly redisService: RedisService) { }

    /**
     * Revoca un token salvandolo in Redis con un TTL fisso
     * @param token Token JWT da revocare
     * @param expiresIn Durata standard del token in secondi (es. 3600 per 1h)
     */
    async revokeToken(jti: UUID, expiresIn: number): Promise<void> {
        await this.redisService.set(`revoked:${jti.toString()}`, 'true', expiresIn);
    }

    /**
     * Controlla se un token è stato revocato
     * @param token Token JWT da verificare
     * @returns True se il token è revocato
     */
    async isTokenRevoked(token: string): Promise<boolean> {
        return !!(await this.redisService.get(`revoked:${token}`));
    }
}
