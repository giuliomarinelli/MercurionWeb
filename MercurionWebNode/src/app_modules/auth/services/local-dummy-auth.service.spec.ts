import { LOCAL_DUMMY_AUTH, type FingerprintData } from '@mercurion/rest-contracts'
import type { UUID } from 'crypto'
import { UserService } from 'src/app_modules/user/services/user.service'

import { JwtToolsService } from './jwt-tools.service'
import { LocalDummyAuthService } from './local-dummy-auth.service'
import { ScopeService } from './scope.service'
import { SessionService } from './session.service'

describe('LocalDummyAuthService', () => {
  const sessionId = '00000000-0000-4000-8000-000000000102' as UUID
  const deviceId = '00000000-0000-4000-8000-000000000103' as UUID
  let service: LocalDummyAuthService
  let users: Pick<UserService, 'ensureLocalDevelopmentUser'>
  let scopeService: Pick<ScopeService, 'getEncryptedStandardScopes'>
  let sessionService: Pick<SessionService, 'createSession' | 'activateSession'>
  let jwtTools: Pick<JwtToolsService, 'generateToken'>
  const appConfiguration = {
    env: 'development',
    localDummyAuth: true
  }

  beforeEach(() => {
    users = { ensureLocalDevelopmentUser: jest.fn().mockResolvedValue(undefined) }
    scopeService = {
      getEncryptedStandardScopes: jest.fn().mockReturnValue(['encrypted-scope'])
    }
    sessionService = {
      createSession: jest.fn().mockResolvedValue({ sessionId }),
      activateSession: jest.fn().mockResolvedValue(undefined)
    }
    jwtTools = {
      generateToken: jest.fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('ws-access-token')
    }
    service = new LocalDummyAuthService(
      users as UserService,
      scopeService as ScopeService,
      sessionService as SessionService,
      jwtTools as JwtToolsService,
      { getOrThrow: jest.fn(() => appConfiguration) } as never
    )
    appConfiguration.env = 'development'
    appConfiguration.localDummyAuth = true
  })

  it('creates a persistent verified local account when enabled and absent', async () => {
    await service.onApplicationBootstrap()

    expect(users.ensureLocalDevelopmentUser).toHaveBeenCalledWith(['encrypted-scope'])
  })

  it('does not access the database when the local fixture is disabled', async () => {
    appConfiguration.localDummyAuth = false

    await service.onApplicationBootstrap()

    expect(users.ensureLocalDevelopmentUser).not.toHaveBeenCalled()
  })

  it('accepts the explicit canonical localhost activation request', () => {
    const request = {
      headers: {
        host: 'localhost',
        origin: LOCAL_DUMMY_AUTH.canonicalOrigin,
        [LOCAL_DUMMY_AUTH.headerName.toLowerCase()]: LOCAL_DUMMY_AUTH.marker
      }
    }

    expect(service.acceptsActivationRequest(request as never)).toBe(true)
  })

  it('accepts a browser same-origin request when nginx omits origin and referer', () => {
    expect(service.acceptsActivationRequest({
      headers: {
        host: 'localhost',
        'sec-fetch-site': 'same-origin',
        [LOCAL_DUMMY_AUTH.headerName.toLowerCase()]: LOCAL_DUMMY_AUTH.marker
      }
    })).toBe(true)
  })

  it.each([
    ['production even with the flag', 'production', 'true', 'localhost', LOCAL_DUMMY_AUTH.canonicalOrigin],
    ['development without the flag', 'development', 'false', 'localhost', LOCAL_DUMMY_AUTH.canonicalOrigin],
    ['a non-canonical host', 'development', 'true', 'example.test', LOCAL_DUMMY_AUTH.canonicalOrigin],
    ['a non-canonical origin', 'development', 'true', 'localhost', 'http://localhost:3498']
  ])('rejects %s', (_case, appEnv, flag, host, origin) => {
    appConfiguration.env = appEnv
    appConfiguration.localDummyAuth = flag === 'true'

    expect(service.acceptsActivationRequest({
      headers: {
        host,
        origin,
        [LOCAL_DUMMY_AUTH.headerName.toLowerCase()]: LOCAL_DUMMY_AUTH.marker
      }
    })).toBe(false)
  })

  it('creates an active Redis session and real signed JWTs', async () => {
    const result = await service.createAuthenticatedSession(
      deviceId,
      '127.0.0.1',
      { browser: { name: 'Chrome' } },
      { system: { platform: 'Windows' } } as FingerprintData
    )

    expect(sessionService.createSession).toHaveBeenCalledWith(expect.objectContaining({
      userId: LOCAL_DUMMY_AUTH.userId,
      deviceId,
      IP: '127.0.0.1'
    }), true)
    expect(sessionService.activateSession).toHaveBeenCalledWith(
      sessionId,
      LOCAL_DUMMY_AUTH.userId
    )
    expect(result).toEqual({
      sessionId,
      accessToken: 'access-token',
      ws_accessToken: 'ws-access-token'
    })
  })
})
