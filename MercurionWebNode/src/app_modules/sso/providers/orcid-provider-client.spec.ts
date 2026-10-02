import { ConfigService } from '@nestjs/config'

import { ExternalHttpPort } from 'src/infrastructure/external-http/external-http.port'
import { LoggerPort } from 'src/logging/logger.port'

import { OrcidProviderClient } from './orcid-provider-client'

describe('OrcidProviderClient', () => {
  let service: OrcidProviderClient

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue({
        clientId: 'APP-TEST',
        clientSecret: 'secret',
        redirectUri: 'http://localhost:8888/api/oauth2/sso/ORCID/callback',
        issuer: 'https://sandbox.orcid.org',
      }),
    } as unknown as ConfigService

    const loggerFactory = {
      forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
    } as unknown as LoggerPort

    service = new OrcidProviderClient(
      configService,
      loggerFactory,
      {} as ExternalHttpPort,
    )
  })

  it('builds an Authorization Code OIDC request against the configured issuer', () => {
    const url = new URL(service.getAuthorizationUrl('state-123'))

    expect(url.origin).toBe('https://sandbox.orcid.org')
    expect(url.pathname).toBe('/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('APP-TEST')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:8888/api/oauth2/sso/ORCID/callback',
    )
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('openid')
    expect(url.searchParams.get('state')).toBe('state-123')
  })
})
