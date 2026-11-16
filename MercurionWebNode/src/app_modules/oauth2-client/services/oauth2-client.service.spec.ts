import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { UUID } from 'crypto'
import { RedisService } from 'src/app_modules/redis/services/redis.service'
import { LoggerPort } from 'src/logging/logger.port'
import { ExternalHttpPort } from 'src/infrastructure/external-http/external-http.port'
import { OAuth2ClientService } from './oauth2-client.service'
import { OAuth2PersistenceService } from './o-auth2-persistence.service'
import { OAuthStateService } from './oauth-state.service'

describe('OAuth2ClientService', () => {
  const owner = '01999999-9999-7999-8999-999999999999' as UUID
  const redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() }
  const persistence = {
    saveRefreshToken: jest.fn(), getRefreshToken: jest.fn(), deleteCredentials: jest.fn(),
  }
  const http = { post: jest.fn(), get: jest.fn() }
  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
  const providerConfig: Record<string, unknown> = {
    appKey: 'key', appSecret: 'secret', tokenUrl: 'https://provider/token',
    authUrl: 'https://provider/auth', redirectUri: 'https://app/callback',
  }
  let service: OAuth2ClientService

  beforeEach(async () => {
    jest.clearAllMocks()
    delete providerConfig.revocationUrl
    delete providerConfig.revocationAuth
    const module = await Test.createTestingModule({ providers: [
      OAuth2ClientService,
      { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(providerConfig) } },
      { provide: RedisService, useValue: redis },
      { provide: OAuth2PersistenceService, useValue: persistence },
      { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue(logger) } },
      { provide: ExternalHttpPort, useValue: http },
      { provide: OAuthStateService, useValue: { create: jest.fn() } },
    ] }).compile()
    service = module.get(OAuth2ClientService)
  })

  it('persists a rotated refresh token before publishing the new access token', async () => {
    redis.get.mockResolvedValue(null)
    persistence.getRefreshToken.mockResolvedValue('old-refresh-literal')
    http.post.mockResolvedValue({ data: {
      access_token: 'new-access-literal', new_refresh_token: 'new-refresh-literal', expires_in: 120,
    } })
    const order: string[] = []
    persistence.saveRefreshToken.mockImplementation(async () => { order.push('durable') })
    redis.set.mockImplementation(async () => { order.push('cache'); return 'OK' })

    await expect(service.getAccessToken('DROPBOX', owner)).resolves.toBe('new-access-literal')

    expect(order).toEqual(['durable', 'cache'])
    expect(persistence.saveRefreshToken).toHaveBeenCalledWith('dropbox', 'new-refresh-literal', owner)
    expect(redis.set).toHaveBeenCalledWith(expect.stringContaining(`dropbox:${owner}`), 'new-access-literal', 120)
  })

  it('redacts provider error bodies and token literals from logs', async () => {
    redis.get.mockResolvedValue(null)
    persistence.getRefreshToken.mockResolvedValue('refresh-literal')
    http.post.mockRejectedValue(new Error('provider body access_token=leaked-literal'))

    await expect(service.getAccessToken('dropbox', owner)).rejects.toThrow('Failed to refresh access token')
    expect(JSON.stringify(logger.error.mock.calls)).toBe('[["OAuth token refresh failed for provider dropbox"]]')
  })

  it('disconnects idempotently and removes owner-scoped cache and persistence', async () => {
    redis.get.mockResolvedValue(null)
    redis.del.mockResolvedValue(0)
    persistence.deleteCredentials.mockResolvedValue(undefined)

    await expect(service.disconnect('DROPBOX', owner)).resolves.toBeUndefined()

    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining(`dropbox:${owner}`))
    expect(persistence.deleteCredentials).toHaveBeenCalledWith('dropbox', owner)
    expect(http.post).not.toHaveBeenCalled()
  })

  it('attempts supported provider revocation but always completes local deletion', async () => {
    providerConfig.revocationUrl = 'https://provider/revoke'
    providerConfig.revocationAuth = 'bearer'
    redis.get.mockResolvedValue('access-literal')
    http.post.mockRejectedValue(new Error('body token=access-literal'))

    await expect(service.disconnect('dropbox', owner)).resolves.toBeUndefined()

    expect(http.post).toHaveBeenCalledWith(
      'https://provider/revoke',
      undefined,
      expect.objectContaining({ headers: { Authorization: 'Bearer access-literal' } }),
    )
    expect(redis.del).toHaveBeenCalled()
    expect(persistence.deleteCredentials).toHaveBeenCalled()
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('access-literal')
  })
})
