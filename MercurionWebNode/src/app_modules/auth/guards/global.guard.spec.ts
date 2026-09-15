import type { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { UUID } from 'node:crypto'

import { IS_PUBLIC_KEY, IS_SOFT_AUTHORIZATION } from 'src/metadata/metadata'

import type { AppJwtPayload } from '../Models/interfaces/app-jwt-payload.interface'
import { TokenType } from '../Models/enums/token-type.enum'
import { GlobalGuard } from './global.guard'
import type {
  AuthenticationAttemptState,
  AuthenticationRequestContext
} from './policies/authentication-policy.types'

const userId = '11111111-1111-4111-8111-111111111111' as UUID
const sessionId = '22222222-2222-4222-8222-222222222222' as UUID

function tokenPayload(
  suffix: string = '3'
): AppJwtPayload {
  return {
    iss: 'issuer',
    sub: userId,
    jti: `${suffix.repeat(8)}-${suffix.repeat(4)}-4${suffix.repeat(3)}-8${suffix.repeat(3)}-${suffix.repeat(12)}` as UUID,
    sid: sessionId,
    typ: TokenType.AccessToken,
    iat: 1,
    exp: 2,
    scp: 'ViewMolecule'
  }
}

function executionContext(name: string): ExecutionContext {
  void name
  const handler = () => undefined
  return {
    getHandler: () => handler,
    getType: () => 'http'
  } as unknown as ExecutionContext
}

function normalizedContext(
  context: ExecutionContext
): AuthenticationRequestContext {
  return {
    executionContext: context,
    transport: 'http',
    request: { headers: {} } as never,
    reply: {} as never,
    isSoftAuth: false,
    sessionId,
    deviceId: 'device-1'
  }
}

function setup(metadata: { public?: boolean; soft?: boolean } = {}) {
  const reflector = new Reflector()
  jest.spyOn(reflector, 'get').mockImplementation((key: string) => {
    if (key === IS_PUBLIC_KEY) return metadata.public
    if (key === IS_SOFT_AUTHORIZATION) return metadata.soft
    return undefined
  })
  const contexts = new Map<ExecutionContext, AuthenticationRequestContext>()
  const contextFactory = {
    supports: jest.fn().mockReturnValue(true),
    create: jest.fn((context: ExecutionContext, isSoftAuth: boolean) => {
      const result = contexts.get(context) ?? normalizedContext(context)
      return { ...result, isSoftAuth }
    })
  }
  const credentialPolicy = {
    extractAccessToken: jest.fn().mockReturnValue('access-token')
  }
  const authenticationPolicy = {
    authenticate: jest.fn().mockResolvedValue({
      mode: 'current',
      payload: tokenPayload()
    }),
    issueRefreshedToken: jest.fn().mockResolvedValue('refreshed-token'),
    scheduleRevocation: jest.fn()
  }
  const scopePolicy = {
    authorize: jest.fn().mockResolvedValue(undefined),
    resolveGrantedScopes: jest.fn().mockResolvedValue(['scope'])
  }
  const sessionPolicy = {
    validate: jest.fn().mockResolvedValue(undefined),
    touch: jest.fn().mockResolvedValue(undefined)
  }
  const transportPolicy = {
    setRefreshedAccessToken: jest.fn(),
    setAuthenticatedUser: jest.fn(),
    setScopes: jest.fn()
  }
  const failurePolicy = {
    deny: jest.fn((
      _context: AuthenticationRequestContext,
      _attempt: AuthenticationAttemptState,
      error: unknown
    ) => Promise.reject(
      error instanceof Error ? error : new Error(String(error))
    ))
  }

  const guard = new GlobalGuard(
    reflector,
    contextFactory,
    credentialPolicy as never,
    authenticationPolicy as never,
    scopePolicy as never,
    sessionPolicy as never,
    transportPolicy as never,
    failurePolicy as never
  )

  return {
    guard,
    reflector,
    contexts,
    contextFactory,
    credentialPolicy,
    authenticationPolicy,
    scopePolicy,
    sessionPolicy,
    transportPolicy,
    failurePolicy
  }
}

describe('GlobalGuard policy pipeline', () => {
  it('allows public handlers without creating an authentication context', async () => {
    const { guard, contextFactory } = setup({ public: true })

    await expect(guard.canActivate(executionContext('public'))).resolves.toBe(true)
    expect(contextFactory.supports).not.toHaveBeenCalled()
  })

  it('denies unsupported transports without invoking policies', async () => {
    const { guard, contextFactory, credentialPolicy } = setup()
    contextFactory.supports.mockReturnValue(false)

    await expect(guard.canActivate(executionContext('unsupported')))
      .resolves.toBe(false)
    expect(credentialPolicy.extractAccessToken).not.toHaveBeenCalled()
  })

  it.each([
    ['hard', false],
    ['soft', true]
  ])('passes explicit %s-auth metadata into the normalized context', async (
    _name,
    isSoftAuth
  ) => {
    const context = executionContext('metadata')
    const { guard, contextFactory } = setup({ soft: isSoftAuth })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(contextFactory.create).toHaveBeenCalledWith(context, isSoftAuth)
  })

  it('composes the current-token policies in security-preserving order', async () => {
    const context = executionContext('current')
    const pipeline = setup()

    await expect(pipeline.guard.canActivate(context)).resolves.toBe(true)

    const order = [
      pipeline.credentialPolicy.extractAccessToken,
      pipeline.authenticationPolicy.authenticate,
      pipeline.scopePolicy.authorize,
      pipeline.sessionPolicy.validate,
      pipeline.sessionPolicy.touch,
      pipeline.transportPolicy.setAuthenticatedUser,
      pipeline.scopePolicy.resolveGrantedScopes,
      pipeline.transportPolicy.setScopes
    ].map(mock => mock.mock.invocationCallOrder[0])
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(pipeline.transportPolicy.setRefreshedAccessToken).not.toHaveBeenCalled()
    expect(pipeline.authenticationPolicy.scheduleRevocation).not.toHaveBeenCalled()
  })

  it('keeps refresh generation, transport mutation and delayed revocation ordered', async () => {
    const context = executionContext('refresh')
    const pipeline = setup()
    pipeline.authenticationPolicy.authenticate.mockResolvedValue({
      mode: 'refresh',
      payload: tokenPayload()
    })

    await expect(pipeline.guard.canActivate(context)).resolves.toBe(true)

    const order = [
      pipeline.scopePolicy.authorize,
      pipeline.sessionPolicy.validate,
      pipeline.authenticationPolicy.issueRefreshedToken,
      pipeline.sessionPolicy.touch,
      pipeline.transportPolicy.setRefreshedAccessToken,
      pipeline.authenticationPolicy.scheduleRevocation,
      pipeline.transportPolicy.setAuthenticatedUser,
      pipeline.scopePolicy.resolveGrantedScopes,
      pipeline.transportPolicy.setScopes
    ].map(mock => mock.mock.invocationCallOrder[0])
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('reports refresh issuance failures at the refresh policy stage', async () => {
    const context = executionContext('refresh-failure')
    const pipeline = setup()
    const failure = new Error('refresh-failure')
    pipeline.authenticationPolicy.authenticate.mockResolvedValue({
      mode: 'refresh',
      payload: tokenPayload()
    })
    pipeline.authenticationPolicy.issueRefreshedToken.mockRejectedValue(failure)

    await expect(pipeline.guard.canActivate(context)).rejects.toBe(failure)
    expect(pipeline.failurePolicy.deny).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stage: 'refresh',
        userId
      }),
      failure
    )
  })

  it.each([
    ['credential', 'extractAccessToken'],
    ['authentication', 'authenticate'],
    ['authorization', 'authorize'],
    ['session', 'validate'],
    ['principal', 'resolveGrantedScopes']
  ] as const)('reports a %s-stage denial to the failure policy', async (
    expectedStage,
    failingMethod
  ) => {
    const context = executionContext(expectedStage)
    const pipeline = setup()
    const failure = new Error(expectedStage)
    const owner = failingMethod === 'extractAccessToken'
      ? pipeline.credentialPolicy
      : failingMethod === 'authenticate'
        ? pipeline.authenticationPolicy
        : failingMethod === 'authorize' || failingMethod === 'resolveGrantedScopes'
          ? pipeline.scopePolicy
          : pipeline.sessionPolicy
    if (failingMethod === 'extractAccessToken') {
      ;(owner[failingMethod] as jest.Mock).mockImplementationOnce(() => {
        throw failure
      })
    } else {
      ;(owner[failingMethod] as jest.Mock).mockRejectedValueOnce(failure)
    }

    await expect(pipeline.guard.canActivate(context)).rejects.toBe(failure)
    expect(pipeline.failurePolicy.deny).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stage: expectedStage }),
      failure
    )
  })

  it('keeps simultaneous invocation state independent', async () => {
    const firstContext = executionContext('first')
    const secondContext = executionContext('second')
    const pipeline = setup()
    const firstNormalized = normalizedContext(firstContext)
    const secondNormalized = normalizedContext(secondContext)
    pipeline.contexts.set(firstContext, firstNormalized)
    pipeline.contexts.set(secondContext, secondNormalized)
    pipeline.credentialPolicy.extractAccessToken.mockImplementation(
      (context: AuthenticationRequestContext) =>
        context.executionContext === firstContext ? 'first-token' : 'second-token'
    )

    let releaseFirst: () => void = () => undefined
    const firstWait = new Promise<void>(resolve => {
      releaseFirst = resolve
    })
    pipeline.authenticationPolicy.authenticate.mockImplementation(
      async (token: string) => {
        if (token === 'first-token') {
          await firstWait
          throw new Error('first-failure')
        }
        releaseFirst()
        return { mode: 'current', payload: tokenPayload('4') }
      }
    )
    const attemptSnapshots: AuthenticationAttemptState[] = []
    pipeline.failurePolicy.deny.mockImplementation(
      (
        _context: AuthenticationRequestContext,
        attempt: AuthenticationAttemptState,
        error: unknown
      ) => {
        attemptSnapshots.push({ ...attempt })
        return Promise.reject(
          error instanceof Error ? error : new Error(String(error))
        )
      }
    )

    const [first, second] = await Promise.allSettled([
      pipeline.guard.canActivate(firstContext),
      pipeline.guard.canActivate(secondContext)
    ])

    expect(first.status).toBe('rejected')
    expect(second).toEqual({ status: 'fulfilled', value: true })
    expect(pipeline.failurePolicy.deny).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stage: 'authentication',
        accessToken: 'first-token'
      }),
      expect.any(Error)
    )
    expect(attemptSnapshots[0]).not.toHaveProperty('payload')
    expect(pipeline.transportPolicy.setAuthenticatedUser).toHaveBeenCalledWith(
      expect.objectContaining({ executionContext: secondContext }),
      userId
    )
  })
})
