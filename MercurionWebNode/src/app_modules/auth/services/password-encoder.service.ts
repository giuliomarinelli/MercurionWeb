import { Injectable, Logger } from '@nestjs/common'
import { PasswordEncoder } from '../Models/interfaces/password-encoder.interface'
import * as argon2 from 'argon2'
import { RpcException } from '@nestjs/microservices'
import { createHmac } from 'crypto'
import { ConfigService } from '@nestjs/config'
import { CompareResult } from '../Models/enums/compare-result.enum'

@Injectable()
export class PasswordEncoderService implements PasswordEncoder {

    private readonly logger = new Logger(PasswordEncoderService.name)

    private readonly pepper: string

    constructor(
        private readonly configService: ConfigService
    ) {
        this.pepper = this.configService.get<string>('App.passwordPepper')!
    }

    private readonly params = {
        type: argon2.argon2id,
        timeCost: 3,
        memoryCost: 1 << 16, // 64 MiB
        parallelism: 2,
        hashLength: 32,
        version: 0x13,
    } as const

    private normalize(pw: string): string {
        const capped = pw.length > 1024 ? pw.slice(0, 1024) : pw
        return capped.normalize('NFKC')
    }

    private makePepper(pwNorm: string): Buffer {
        // HMAC-SHA256 del testo normalizzato, senza esporre il pepper in chiaro
        return createHmac('sha256', this.pepper).update(pwNorm, 'utf8').digest()
    }

    private legacyMaterial(pwNorm: string): string {
        return pwNorm
    }

    public async encode(password: string): Promise<string> {
        try {
            const norm = this.normalize(password)
            const material = this.makePepper(norm)
            return await argon2.hash(material, this.params)
        } catch (e) {
            const message = e.message as string || 'Unknown error'
            this.logger.warn(`Error during password encoding: ${message}`)
            throw new RpcException('PasswordEncodingException')
        }
    }

    /** Confronto semplice (usa sempre lo schema corrente con pepper). */
    public async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
        try {
            const norm = this.normalize(plainPassword)
            const material = this.makePepper(norm)
            return await argon2.verify(hashedPassword, material)
        } catch (e) {
            const message = e.message as string || 'Unknown error'
            this.logger.warn(`Error during password comparison: ${message}`)
            throw new RpcException('PasswordComparingException')
        }
    }

    /**
     * Confronto con fallback: prova prima con pepper; se fallisce e allowLegacy=true,
     * ritenta senza pepper (per migrazione indolore degli hash storici).
     */
    public async compareWithFallback(
        plainPassword: string,
        hashedPassword: string,
        allowLegacy = true
    ): Promise<CompareResult> {
        try {
            const norm = this.normalize(plainPassword)

            // 1) schema nuovo (pepper)
            const pep = this.makePepper(norm)
            if (await argon2.verify(hashedPassword, pep)) {
                return CompareResult.MatchPeppered
            }

            // 2) schema legacy (no pepper)
            if (allowLegacy) {
                const legacy = this.legacyMaterial(norm)
                if (await argon2.verify(hashedPassword, legacy)) {
                    return CompareResult.MatchLegacy
                }
            }

            return CompareResult.NoMatch
        } catch (e) {
            const message = e?.message as string ?? 'Unknown error'
            this.logger.warn(`Error during password comparison (fallback): ${message}`)
            throw new RpcException('PasswordComparingException')
        }
    }

    // Consente rehash on-the-fly nel chiamante quando cambia policy
    public async needsRehash(hashedPassword: string): Promise<boolean> {
        // Fallback portabile (niente cast a any): parse del digest
        try {
            // Esempio: $argon2id$v=19$m=65536,t=3,p=2$...
            const m = hashedPassword.match(/^\$argon2id\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$/)
            if (!m) return true
            const [, vStr, mCostStr, tCostStr, parStr] = m
            const v = Number(vStr)
            const mCost = Number(mCostStr)
            const tCost = Number(tCostStr)
            const par = Number(parStr)
            return (
                v !== this.params.version ||
                mCost !== this.params.memoryCost ||
                tCost !== this.params.timeCost ||
                par !== this.params.parallelism
            )
        } catch {
            return true
        }
    }
}
