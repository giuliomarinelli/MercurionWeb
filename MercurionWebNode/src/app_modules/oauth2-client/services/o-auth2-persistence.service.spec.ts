import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { UUID } from 'crypto'
import { OAuth2TokenEntity } from '../models/entities/oauth2-token.entity'
import { OAuth2PersistenceService } from './o-auth2-persistence.service'
import { ProviderCredentialCipherService } from './provider-credential-cipher.service'

describe('OAuth2PersistenceService', () => {
  const owner = '01999999-9999-7999-8999-999999999999' as UUID
  const otherOwner = '01888888-8888-7888-8888-888888888888' as UUID
  const repository = {
    findOne: jest.fn(), save: jest.fn(), create: jest.fn(), delete: jest.fn(),
  }
  const cipher = {
    encrypt: jest.fn((value: string, provider: string, scope: string) => `oauth2:v1:${provider}:${scope}:${value}`),
    decrypt: jest.fn(() => 'refresh-secret'),
    isEncrypted: jest.fn(() => true),
  }
  let service: OAuth2PersistenceService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await Test.createTestingModule({ providers: [
      OAuth2PersistenceService,
      { provide: getRepositoryToken(OAuth2TokenEntity), useValue: repository },
      { provide: ProviderCredentialCipherService, useValue: cipher },
    ] }).compile()
    service = module.get(OAuth2PersistenceService)
  })

  it('encrypts durable refresh tokens and never persists the literal', async () => {
    repository.findOne.mockResolvedValue(null)
    repository.create.mockImplementation(value => value)

    await service.saveRefreshToken('DROPBOX', 'refresh-secret', owner, 'files.read')

    expect(cipher.encrypt).toHaveBeenCalledWith('refresh-secret', 'dropbox', owner)
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'dropbox', userId: owner, scope: 'files.read',
      refreshToken: `oauth2:v1:dropbox:${owner}:refresh-secret`,
    }))
    expect(JSON.stringify(repository.save.mock.calls)).not.toContain('"refreshToken":"refresh-secret"')
  })

  it('loads only the exact owner/provider record and decrypts inside the boundary', async () => {
    repository.findOne.mockResolvedValue({ refreshToken: 'oauth2:v1:payload' })

    await expect(service.getRefreshToken('Dropbox', owner)).resolves.toBe('refresh-secret')

    expect(repository.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { provider: 'dropbox', userId: owner },
      select: expect.objectContaining({ refreshToken: true }),
    }))
    expect(cipher.decrypt).toHaveBeenCalledWith('oauth2:v1:payload', 'dropbox', owner)

    repository.findOne.mockResolvedValue(null)
    await expect(service.getRefreshToken('dropbox', otherOwner)).resolves.toBeNull()
  })

  it('migrates a legacy plaintext value on first owner-scoped read', async () => {
    repository.findOne
      .mockResolvedValueOnce({ refreshToken: 'legacy-secret' })
      .mockResolvedValueOnce({ id: 'id', provider: 'dropbox', userId: owner, refreshToken: 'legacy-secret' })
    cipher.isEncrypted.mockReturnValueOnce(false)

    await expect(service.getRefreshToken('dropbox', owner)).resolves.toBe('legacy-secret')
    expect(cipher.encrypt).toHaveBeenCalledWith('legacy-secret', 'dropbox', owner)
    expect(repository.save).toHaveBeenCalled()
  })

  it('deletes only the exact owner/provider credential idempotently', async () => {
    repository.delete.mockResolvedValue({ affected: 0 })
    await expect(service.deleteCredentials('DROPBOX', owner)).resolves.toBeUndefined()
    expect(repository.delete).toHaveBeenCalledWith({ provider: 'dropbox', userId: owner })
  })

  it('omits encrypted material from generic entity serialization', () => {
    const entity = Object.assign(new OAuth2TokenEntity(), {
      id: owner, provider: 'dropbox', userId: owner,
      refreshToken: 'oauth2:v1:encrypted-material', scope: null,
    })
    expect(JSON.stringify(entity)).not.toContain('refreshToken')
    expect(JSON.stringify(entity)).not.toContain('encrypted-material')
  })
})
