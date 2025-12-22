// jwt-keys.provider.ts
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Environment } from 'src/config/config'

export interface JwtKeyPair {
    privateKey: string
    publicKey: string
}

@Injectable()
export class JwtKeysProvider {

    constructor(private readonly config: ConfigService) { }

    private readKey(baseName: string): string {
        const b64 = this.config.get<string>(`${baseName}_B64`)
        if (b64) {
            return Buffer.from(b64, 'base64').toString('utf8')
        }

        const raw = this.config.get<string>(baseName)
        if (raw) {
            return raw
        }

        throw new Error(`Missing ${baseName}_B64 or ${baseName}`)
    }

    private assertPem(name: string, key: string): void {
        if (!key.includes('BEGIN') || !key.includes('END')) {
            throw new Error(`${name} is not a valid PEM block`)
        }
    }

    private isProdLike(env: Environment): boolean {
        return env === Environment.Production || env === Environment.Staging
    }

    getAccessKeyPair(): JwtKeyPair {
        const env = this.config.get<Environment>('App.env') ?? Environment.Development

        if (this.isProdLike(env)) {
            const privateKey = this.readKey('JWT_RS256_PRIVATE_KEY')
            const publicKey = this.readKey('JWT_RS256_PUBLIC_KEY')

            this.assertPem('JWT_RS256_PRIVATE_KEY', privateKey)
            this.assertPem('JWT_RS256_PUBLIC_KEY', publicKey)

            return { privateKey, publicKey }
        }

        const suffix = env
        const privateKey = readFileSync(
            resolve(__dirname, `../../../config/keys/private.${suffix}.pem`),
            'utf8'
        )
        const publicKey = readFileSync(
            resolve(__dirname, `../../../config/keys/public.${suffix}.pem`),
            'utf8'
        )

        this.assertPem('private key file', privateKey)
        this.assertPem('public key file', publicKey)

        return { privateKey, publicKey }
    }

    getWsKeyPair(): JwtKeyPair {
        const env = this.config.get<Environment>('App.env') ?? Environment.Development

        if (this.isProdLike(env)) {
            const privateKey = this.readKey('JWT_WS_RS256_PRIVATE_KEY')
            const publicKey = this.readKey('JWT_WS_RS256_PUBLIC_KEY')

            this.assertPem('JWT_WS_RS256_PRIVATE_KEY', privateKey)
            this.assertPem('JWT_WS_RS256_PUBLIC_KEY', publicKey)

            return { privateKey, publicKey }
        }

        const suffix = env
        const privateKey = readFileSync(
            resolve(__dirname, `../../../config/keys/ws_private.${suffix}.pem`),
            'utf8'
        )
        const publicKey = readFileSync(
            resolve(__dirname, `../../../config/keys/ws_public.${suffix}.pem`),
            'utf8'
        )

        this.assertPem('ws private key file', privateKey)
        this.assertPem('ws public key file', publicKey)

        return { privateKey, publicKey }
    }
}
