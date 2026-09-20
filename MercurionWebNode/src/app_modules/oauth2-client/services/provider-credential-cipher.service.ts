import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto'

const ENVELOPE_PREFIX = 'oauth2:v1'

@Injectable()
export class ProviderCredentialCipherService {
  private readonly key: Buffer

  constructor(config: ConfigService) {
    const rootSecret = config.get<string>('App.AES_secret')
    if (!rootSecret) throw new Error('OAuth provider credential encryption key is unavailable')
    this.key = Buffer.from(hkdfSync(
      'sha256',
      Buffer.from(rootSecret, 'base64'),
      Buffer.from('mercurion-oauth2-credential-store'),
      Buffer.from('aes-256-gcm:v1'),
      32,
    ))
  }

  encrypt(value: string, provider: string, ownerScope: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    cipher.setAAD(Buffer.from(`${provider}:${ownerScope}`))
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    return [
      ENVELOPE_PREFIX,
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      ciphertext.toString('base64url'),
    ].join(':')
  }

  decrypt(envelope: string, provider: string, ownerScope: string): string {
    const [domain, version, iv, tag, ciphertext] = envelope.split(':')
    if (`${domain}:${version}` !== ENVELOPE_PREFIX || !iv || !tag || !ciphertext) {
      throw new Error('Unsupported OAuth provider credential envelope')
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'))
    decipher.setAAD(Buffer.from(`${provider}:${ownerScope}`))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(`${ENVELOPE_PREFIX}:`)
  }
}
