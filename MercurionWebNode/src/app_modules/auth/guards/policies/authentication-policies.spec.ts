import { ExecutionContext, HttpException, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { GqlExecutionContext } from '@nestjs/graphql'
import { RpcException } from '@nestjs/microservices'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { UUID } from 'node:crypto'

import { Scope } from 'src/app_modules/user/Models/enums/scope.enum'
import {
  ApplicationErrorCode,
  applicationError,
  getApplicationError
} from 'src/exception-handling/application-error'

import { TokenType } from '../../Models/enums/token-type.enum'
import type { AppJwtPayload } from '../../Models/interfaces/app-jwt-payload.interface'
import { AccessTokenAuthenticationPolicy } from './access-token-authentication.policy'
import { AuthenticationFailurePolicy } from './authentication-failure.policy'
import type { AuthenticationRequestContext } from './authentication-policy.types'
import { AuthenticationRequestContextFactory } from './authentication-request-context.factory'
import { AuthenticationTransportPolicy } from './authentication-transport.policy'
import { CredentialExtractionPolicy } from './credential-extraction.policy'
import { ScopeAuthorizationPolicy } from './scope-authorization.policy'
import { SessionValidationPolicy } from './session-validation.policy'

const userId = '11111111-1111-4111-8111-111111111111' as UUID
const sessionId = '22222222-2222-4222-8222-222222222222' as UUID
const tokenJti = '33333333-3333-4333-8333-333333333333' as UUID

function payload(overrides: Partial<AppJwtPayload> = {}): AppJwtPayload {
  return {
    iss: 'issuer',
    sub: userId,
    jti: tokenJti,
    sid: sessionId,
    typ: TokenType.AccessToken,
    iat: 1,
    exp: 2,
    scp: 'ViewMolecule',
    ...overrides
  }
}

function requestContext(
  overrides: Partial<AuthenticationRequestContext> = {}
): AuthenticationRequestContext {
  return {
    executionContext: {} as ExecutionContext,
    transport: 'http',
    request: {
      headers: {
        'x-session-id': sessionId,
        'x-device-id': 'device-1'
      }
    } as unknown as FastifyRequest,
    reply: {
      header: jest.fn()
    } as unknown as FastifyReply,
    isSoftAuth: false,
    sessionId,
    deviceId: 'device-1',
    ...overrides
  }
}

function loggerFactory() {
  const logger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    fatal: jest.fn(),
    setLogLevels: jest.fn()
  }
  return {
    logger,
    factory: { forContext: jest.fn().mockReturnValue(logger) }
  }
}

async function expectApplicationErrorCode(
  promise: Promise<never>,
  code: ApplicationErrorCode
): Promise<void> {
  try {
    await promise
    throw new Error('Expected promise to reject')
  } catch (error) {
    expect(getApplicationError(error)?.code).toBe(code)
  }
}

describe('AuthenticationRequestContextFactory', () => {
  const factory = new AuthenticationRequestContextFactory()

  it.each([
    ['http', true],
    ['graphql', true],
    ['ws', false],
    ['rpc', false]
  ])('reports %s transport support as %s', (type, expected) => {
    const context = { getType: () => type } as ExecutionContext
    expect(factory.supports(context)).toBe(expected)
  })

  it('normalizes an HTTP request and snapshots request-specific headers', () => {
    const request = {
      headers: {
        'x-session-id': sessionId,
        'x-device-id': 'device-1'
      }
    } as unknown as FastifyRequest
    const reply = {} as FastifyReply
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => reply
      })
    } as unknown as ExecutionContext

    expect(factory.create(context, true)).toEqual({
      executionContext: context,
      transport: 'http',
      request,
      reply,
      isSoftAuth: true,
      sessionId,
      deviceId: 'device-1'
    })
  })

  it('normalizes GraphQL through its request/reply transport boundary', () => {
    const request = { headers: {} } as FastifyRequest
    const reply = {} as FastifyReply
    const context = { getType: () => 'graphql' } as ExecutionContext
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ request, reply })
    } as unknown as GqlExecutionContext)

    expect(factory.create(context, false)).toEqual({
      executionContext: context,
      transport: 'graphql',
      request,
      reply,
      isSoftAuth: false,
      sessionId: undefined,
      deviceId: undefined
    })
  })
})

describe('CredentialExtractionPolicy', () => {
  it('delegates bearer-token extraction to JwtToolsService', () => {
    const jwtTools = {
      extractAccessTokenFromReq: jest.fn().mockReturnValue('access-token')
    }
    const policy = new CredentialExtractionPolicy(jwtTools as never)
    const context = requestContext()

    expect(policy.extractAccessToken(context)).toBe('access-token')
    expect(jwtTools.extractAccessTokenFromReq).toHaveBeenCalledWith(context.request)
  })
})

describe('AccessTokenAuthenticationPolicy', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns a current-token result when ordinary verification succeeds', async () => {
    const tokenPayload = payload()
    const jwtTools = {
      verifyTokenAndGetPayload: jest.fn().mockResolvedValue(tokenPayload)
    }
    const policy = new AccessTokenAuthenticationPolicy(
      jwtTools as never,
      {} as never,
      loggerFactory().factory as never
    )

    await expect(policy.authenticate('token')).resolves.toEqual({
      mode: 'current',
      payload: tokenPayload
    })
    expect(jwtTools.verifyTokenAndGetPayload).toHaveBeenCalledWith(
      'token',
      TokenType.AccessToken
    )
  })

  it('uses expiration-ignoring verification only for the established refresh error', async () => {
    const tokenPayload = payload()
    const jwtTools = {
      verifyTokenAndGetPayload: jest.fn()
        .mockRejectedValueOnce(
          applicationError(ApplicationErrorCode.ACCESS_TOKEN_INVALID_OR_EXPIRED)
        )
        .mockResolvedValueOnce(tokenPayload)
    }
    const policy = new AccessTokenAuthenticationPolicy(
      jwtTools as never,
      {} as never,
      loggerFactory().factory as never
    )

    await expect(policy.authenticate('expired')).resolves.toEqual({
      mode: 'refresh',
      payload: tokenPayload
    })
    expect(jwtTools.verifyTokenAndGetPayload).toHaveBeenNthCalledWith(
      2,
      'expired',
      TokenType.AccessToken,
      true
    )
  })

  it('does not reinterpret other verification errors as refreshable', async () => {
    const denied = applicationError(ApplicationErrorCode.PERMISSION_DENIED)
    const jwtTools = {
      verifyTokenAndGetPayload: jest.fn().mockRejectedValue(denied)
    }
    const policy = new AccessTokenAuthenticationPolicy(
      jwtTools as never,
      {} as never,
      loggerFactory().factory as never
    )

    await expect(policy.authenticate('token')).rejects.toBe(denied)
    expect(jwtTools.verifyTokenAndGetPayload).toHaveBeenCalledTimes(1)
  })

  it('bubbles a failed expiration-ignoring verification', async () => {
    const firstFailure = applicationError(
      ApplicationErrorCode.ACCESS_TOKEN_INVALID_OR_EXPIRED
    )
    const secondFailure = applicationError(
      ApplicationErrorCode.ACCESS_TOKEN_INVALID_OR_EXPIRED
    )
    const jwtTools = {
      verifyTokenAndGetPayload: jest.fn()
        .mockRejectedValueOnce(firstFailure)
        .mockRejectedValueOnce(secondFailure)
    }
    const policy = new AccessTokenAuthenticationPolicy(
      jwtTools as never,
      {} as never,
      loggerFactory().factory as never
    )

    await expect(policy.authenticate('expired')).rejects.toBe(secondFailure)
  })

  it('issues a replacement token and preserves the 1.5 second revocation grace', async () => {
    jest.useFakeTimers()
    const tokenPayload = payload()
    const jwtTools = { generateToken: jest.fn().mockResolvedValue('replacement') }
    const sessionService = { revokeToken: jest.fn().mockResolvedValue(undefined) }
    const policy = new AccessTokenAuthenticationPolicy(
      jwtTools as never,
      sessionService as never,
      loggerFactory().factory as never
    )

    await expect(policy.issueRefreshedToken(tokenPayload)).resolves.toBe('replacement')
    expect(jwtTools.generateToken).toHaveBeenCalledWith(
      userId,
      TokenType.AccessToken,
      sessionId
    )

    policy.scheduleRevocation(tokenPayload)
    expect(sessionService.revokeToken).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1499)
    expect(sessionService.revokeToken).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(sessionService.revokeToken).toHaveBeenCalledWith(tokenJti)
  })
})

describe('SessionValidationPolicy', () => {
  const validationCases = [
    {
      name: 'missing device in current-token flow',
      context: requestContext({ deviceId: undefined }),
      mode: 'current' as const,
      valid: true
    },
    {
      name: 'missing device in refresh flow',
      context: requestContext({ deviceId: undefined }),
      mode: 'refresh' as const,
      valid: true
    },
    {
      name: 'current-token session mismatch',
      context: requestContext({ sessionId: 'different' as UUID }),
      mode: 'current' as const,
      valid: true
    },
    {
      name: 'refresh session mismatch',
      context: requestContext({ sessionId: 'different' as UUID }),
      mode: 'refresh' as const,
      valid: true
    },
    {
      name: 'invalid current session',
      context: requestContext(),
      mode: 'current' as const,
      valid: false
    },
    {
      name: 'invalid refresh session',
      context: requestContext(),
      mode: 'refresh' as const,
      valid: false
    }
  ]

  it.each(validationCases)('rejects $name', async ({ context, mode, valid }) => {
    const sessionService = {
      validateSession: jest.fn().mockResolvedValue(valid)
    }
    const policy = new SessionValidationPolicy(
      sessionService as never,
      loggerFactory().factory as never
    )

    await expect(policy.validate(context, payload(), mode))
      .rejects.toBeInstanceOf(UnauthorizedException)
  })

  it.each(['current', 'refresh'] as const)(
    'accepts and touches a valid %s session',
    async mode => {
      const sessionService = {
        validateSession: jest.fn().mockResolvedValue(true),
        updateLastAccessed: jest.fn().mockResolvedValue(undefined)
      }
      const policy = new SessionValidationPolicy(
        sessionService as never,
        loggerFactory().factory as never
      )
      const tokenPayload = payload()

      await expect(policy.validate(requestContext(), tokenPayload, mode))
        .resolves.toBeUndefined()
      expect(sessionService.validateSession).toHaveBeenCalledWith(
        sessionId,
        'device-1',
        userId
      )
      await policy.touch(tokenPayload)
      expect(sessionService.updateLastAccessed).toHaveBeenCalledWith(
        sessionId,
        userId
      )
    }
  )
})

describe('ScopeAuthorizationPolicy', () => {
  it('separates route authorization from persisted-claim consistency', async () => {
    const scopeService = {
      scopeVerificationLayer: jest.fn().mockResolvedValue(undefined),
      verifyUserClaimScopesConsistencyThenGetScopes: jest.fn()
        .mockResolvedValue([Scope.ViewMolecule])
    }
    const reflector = {} as Reflector
    const policy = new ScopeAuthorizationPolicy(
      scopeService as never,
      reflector
    )
    const context = requestContext()
    const tokenPayload = payload()

    await policy.authorize(context, tokenPayload)
    expect(scopeService.scopeVerificationLayer).toHaveBeenCalledWith(
      userId,
      context.executionContext,
      reflector,
      tokenPayload.scp
    )
    await expect(policy.resolveGrantedScopes(tokenPayload))
      .resolves.toEqual([Scope.ViewMolecule])
  })
})

describe('AuthenticationTransportPolicy', () => {
  it('contains all request/reply authentication mutations', () => {
    const secureCookieService = { clearCookie: jest.fn() }
    const policy = new AuthenticationTransportPolicy(secureCookieService as never)
    const context = requestContext()
    const header = jest.spyOn(context.reply, 'header')

    policy.setRefreshedAccessToken(context, 'a token')
    policy.setAuthenticatedUser(context, userId)
    policy.setScopes(context, [Scope.ViewMolecule])
    policy.clearAuthenticationCookies(context)

    expect(header).toHaveBeenCalledWith(
      'X-New-Access-Token',
      'a%20token'
    )
    expect(context.request.headers['x-new-access-token']).toBe('a token')
    expect(context.request.headers['x-user-id']).toBe(userId)
    expect(context.request.headers['x-scopes']).toBe(
      JSON.stringify([Scope.ViewMolecule])
    )
    expect(secureCookieService.clearCookie).toHaveBeenNthCalledWith(
      1,
      context.reply,
      '__node_session_id'
    )
    expect(secureCookieService.clearCookie).toHaveBeenNthCalledWith(
      2,
      context.reply,
      '__logged_in'
    )
  })
})

describe('AuthenticationFailurePolicy', () => {
  function setup(decoded: AppJwtPayload | null = payload()) {
    const jwtTools = {
      decodeUnsafe: jest.fn().mockReturnValue(decoded)
    }
    const sessionService = {
      destroySessionAndRevokeAllTokensByPlainSessionId: jest.fn()
        .mockResolvedValue(undefined)
    }
    const transportPolicy = {
      clearAuthenticationCookies: jest.fn()
    }
    const logging = loggerFactory()
    const policy = new AuthenticationFailurePolicy(
      jwtTools as never,
      sessionService as never,
      transportPolicy as never,
      logging.factory as never
    )
    return { policy, jwtTools, sessionService, transportPolicy, logging }
  }

  it('preserves permission denied as forbidden without auth cleanup', async () => {
    const { policy, sessionService, transportPolicy } = setup()
    const denied = policy.deny(
      requestContext(),
      { stage: 'authorization', accessToken: 'token', userId },
      applicationError(ApplicationErrorCode.PERMISSION_DENIED)
    )

    await expectApplicationErrorCode(
      denied,
      ApplicationErrorCode.PERMISSION_DENIED
    )
    expect(sessionService.destroySessionAndRevokeAllTokensByPlainSessionId)
      .not.toHaveBeenCalled()
    expect(transportPolicy.clearAuthenticationCookies).not.toHaveBeenCalled()
  })

  it.each([
    new UnauthorizedException(),
    applicationError(ApplicationErrorCode.ACCESS_TOKEN_INVALID_OR_EXPIRED),
    applicationError(ApplicationErrorCode.SESSION_INVALID),
    applicationError(ApplicationErrorCode.SESSION_NOT_FOUND),
    applicationError(ApplicationErrorCode.SESSION_SIGNATURE_INVALID),
    applicationError(ApplicationErrorCode.AUTHENTICATION_UNAUTHORIZED)
  ])('revokes hard-auth sessions for established auth failures', async error => {
    const { policy, sessionService, transportPolicy } = setup()
    await expectApplicationErrorCode(
      policy.deny(
        requestContext(),
        { stage: 'session', accessToken: 'token', userId },
        error
      ),
      ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_FATAL
    )

    expect(sessionService.destroySessionAndRevokeAllTokensByPlainSessionId)
      .toHaveBeenCalledWith(sessionId, userId)
    expect(transportPolicy.clearAuthenticationCookies).toHaveBeenCalled()
  })

  it.each([
    applicationError(ApplicationErrorCode.TOKEN_REVOKED, 'revoked'),
    new RpcException('infrastructure'),
    new Error('infrastructure')
  ])('does not revoke hard-auth sessions for non-auth failures', async error => {
    const { policy, sessionService, transportPolicy } = setup()
    await expectApplicationErrorCode(
      policy.deny(
        requestContext(),
        { stage: 'authentication', accessToken: 'token', userId },
        error
      ),
      ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_FATAL
    )

    expect(sessionService.destroySessionAndRevokeAllTokensByPlainSessionId)
      .not.toHaveBeenCalled()
    expect(transportPolicy.clearAuthenticationCookies).toHaveBeenCalled()
  })

  it('never revokes or clears cookies for soft authentication', async () => {
    const { policy, sessionService, transportPolicy } = setup()
    await expectApplicationErrorCode(
      policy.deny(
        requestContext({ isSoftAuth: true }),
        { stage: 'credential' },
        new UnauthorizedException()
      ),
      ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_SOFT
    )

    expect(sessionService.destroySessionAndRevokeAllTokensByPlainSessionId)
      .not.toHaveBeenCalled()
    expect(transportPolicy.clearAuthenticationCookies).not.toHaveBeenCalled()
  })

  it('uses an unsafe payload user only when its session matches the request', async () => {
    const { policy, sessionService } = setup(payload())
    await expect(policy.deny(
      requestContext(),
      { stage: 'credential', accessToken: 'token' },
      new UnauthorizedException()
    )).rejects.toBeInstanceOf(HttpException)

    expect(sessionService.destroySessionAndRevokeAllTokensByPlainSessionId)
      .toHaveBeenCalledWith(sessionId, userId)
  })

  it('does not trust an unsafe payload user when its session differs', async () => {
    const { policy, sessionService } = setup(payload({
      sid: '44444444-4444-4444-8444-444444444444'
    }))
    await expect(policy.deny(
      requestContext(),
      { stage: 'credential', accessToken: 'token' },
      new UnauthorizedException()
    )).rejects.toBeInstanceOf(HttpException)

    expect(sessionService.destroySessionAndRevokeAllTokensByPlainSessionId)
      .not.toHaveBeenCalled()
  })

  it('keeps cleanup best-effort when session revocation fails', async () => {
    const { policy, sessionService, transportPolicy } = setup()
    sessionService.destroySessionAndRevokeAllTokensByPlainSessionId
      .mockRejectedValue(new Error('redis unavailable'))

    await expect(policy.deny(
      requestContext(),
      { stage: 'session', userId },
      new UnauthorizedException()
    )).rejects.toBeInstanceOf(HttpException)

    expect(transportPolicy.clearAuthenticationCookies).toHaveBeenCalled()
  })

  it('keeps authorization diagnostics request-local', async () => {
    const { policy, logging } = setup()
    await expect(policy.deny(
      requestContext(),
      { stage: 'principal', accessToken: 'old', refreshedToken: 'new', userId },
      new Error('failure')
    )).rejects.toBeInstanceOf(HttpException)

    expect(logging.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('stage=principal'),
      expect.anything()
    )
  })
})
