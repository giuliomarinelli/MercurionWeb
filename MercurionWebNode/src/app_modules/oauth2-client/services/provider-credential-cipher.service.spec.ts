import { ConfigService } from '@nestjs/config'
import { ProviderCredentialCipherService } from './provider-credential-cipher.service'

describe('ProviderCredentialCipherService', () => {
  const service = new ProviderCredentialCipherService({
    get: jest.fn().mockReturnValue(Buffer.alloc(32, 7).toString('base64')),
  } as unknown as ConfigService)

  it('round-trips a versioned envelope without exposing plaintext', () => {
    const encrypted = service.encrypt('literal-token', 'dropbox', 'owner-a')
    expect(encrypted).toMatch(/^oauth2:v1:/)
    expect(encrypted).not.toContain('literal-token')
    expect(service.decrypt(encrypted, 'dropbox', 'owner-a')).toBe('literal-token')
  })

  it('fails deterministically for another owner or provider', () => {
    const encrypted = service.encrypt('literal-token', 'dropbox', 'owner-a')
    expect(() => service.decrypt(encrypted, 'dropbox', 'owner-b')).toThrow()
    expect(() => service.decrypt(encrypted, 'github', 'owner-a')).toThrow()
  })
})
