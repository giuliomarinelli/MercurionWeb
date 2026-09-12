import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TurnstileGuard } from './turnstile.guard';
import { TurnstileService } from '../services/turnstile.service';

describe('TurnstileGuard', () => {
  const verifyToken = jest.fn()
  const appConfiguration = {
    env: 'development',
    disableTurnstile: false
  }
  const guard = new TurnstileGuard(
    { verifyToken } as unknown as TurnstileService,
    { getOrThrow: jest.fn(() => appConfiguration) } as never
  )

  function context(headers: Record<string, string> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ headers }) })
    } as unknown as ExecutionContext
  }

  beforeEach(() => verifyToken.mockReset())

  it('bypasses Turnstile only when development and the flag are both active', async () => {
    appConfiguration.env = 'development'
    appConfiguration.disableTurnstile = true

    await expect(guard.canActivate(context())).resolves.toBe(true)
    expect(verifyToken).not.toHaveBeenCalled()
  })

  it.each([
    ['production with the flag active', 'production', 'true'],
    ['development with the flag inactive', 'development', 'false'],
  ])('does not bypass Turnstile in %s', async (_case, appEnv, flag) => {
    appConfiguration.env = appEnv
    appConfiguration.disableTurnstile = flag === 'true'

    await expect(guard.canActivate(context())).rejects.toThrow(
      new UnauthorizedException('Turnstile::Missing challenge token')
    )
    expect(verifyToken).not.toHaveBeenCalled()
  })

  it('keeps normal server-side token verification when bypass is unavailable', async () => {
    appConfiguration.env = 'production'
    appConfiguration.disableTurnstile = true
    verifyToken.mockResolvedValue(true)

    await expect(guard.canActivate(context({
      'x-challenge-token': 'challenge-token',
      'x-client-ip': '127.0.0.1'
    }))).resolves.toBe(true)
    expect(verifyToken).toHaveBeenCalledWith('challenge-token', '127.0.0.1')
  })
})
