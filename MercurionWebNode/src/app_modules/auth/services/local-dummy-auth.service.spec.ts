import { LOCAL_DUMMY_AUTH, type FingerprintData } from '@mercurion/rest-contracts'
import type { UUID } from 'crypto'
import type { Repository } from 'typeorm'

import { User } from 'src/app_modules/user/Models/entities/user.entity'

import { JwtToolsService } from './jwt-tools.service'
import { LocalDummyAuthService } from './local-dummy-auth.service'
import { ScopeService } from './scope.service'
import { SessionService } from './session.service'

describe('LocalDummyAuthService', () => {
  const sessionId = '00000000-0000-4000-8000-000000000102' as UUID
  const deviceId = '00000000-0000-4000-8000-000000000103' as UUID
  let service: LocalDummyAuthService
  let userRepo: Pick<Repository<User>, 'findOne' | 'createQueryBuilder'>
  let scopeService: Pick<ScopeService, 'getEncryptedStandardScopes'>
  let sessionService: Pick<SessionService, 'createSession' | 'activateSession'>
  let jwtTools: Pick<JwtToolsService, 'generateToken'>
  let execute: jest.Mock
  let values: jest.Mock
  let callListeners: jest.Mock
  const appConfiguration = {
    env: 'development',
    localDummyAuth: true
  }

  beforeEach(() => {
    execute = jest.fn().mockResolvedValue(undefined)
    values = jest.fn().mockReturnThis()
    callListeners = jest.fn().mockReturnThis()
    const queryBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values,
      orIgnore: jest.fn().mockReturnThis(),
      callListeners,
      execute
    }
    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder)
    }
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
      userRepo as Repository<User>,
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

    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { id: LOCAL_DUMMY_AUTH.userId },
      select: { id: true }
    })
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      id: LOCAL_DUMMY_AUTH.userId,
      email: LOCAL_DUMMY_AUTH.email,
      firstName: LOCAL_DUMMY_AUTH.firstName,
      lastName: LOCAL_DUMMY_AUTH.lastName,
      initials: LOCAL_DUMMY_AUTH.initials,
      isVerified: true,
      scopes: ['encrypted-scope']
    }))
    expect(callListeners).toHaveBeenCalledWith(false)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('preserves an existing local account instead of resetting test data', async () => {
    ;(userRepo.findOne as jest.Mock).mockResolvedValue({ id: LOCAL_DUMMY_AUTH.userId })

    await service.onApplicationBootstrap()

    expect(userRepo.createQueryBuilder).not.toHaveBeenCalled()
  })

  it('does not access the database when the local fixture is disabled', async () => {
    appConfiguration.localDummyAuth = false

    await service.onApplicationBootstrap()

    expect(userRepo.findOne).not.toHaveBeenCalled()
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
