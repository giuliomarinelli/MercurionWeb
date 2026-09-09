import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TurnstileGuard } from './turnstile.guard';
import { TurnstileService } from '../services/turnstile.service';

describe('TurnstileGuard', () => {
  const originalAppEnv = process.env.APP_ENV
  const originalDisableTurnstile = process.env.DISABLE_TURNSTILE
  const verifyToken = jest.fn()
  const guard = new TurnstileGuard({ verifyToken } as unknown as TurnstileService)

  function context(headers: Record<string, string> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ headers }) })
    } as unknown as ExecutionContext
  }

  beforeEach(() => verifyToken.mockReset())

  afterAll(() => {
    if (originalAppEnv === undefined) delete process.env.APP_ENV
    else process.env.APP_ENV = originalAppEnv
    if (originalDisableTurnstile === undefined) delete process.env.DISABLE_TURNSTILE
    else process.env.DISABLE_TURNSTILE = originalDisableTurnstile
  })

  it('bypasses Turnstile only when development and the flag are both active', async () => {
    process.env.APP_ENV = 'development'
    process.env.DISABLE_TURNSTILE = 'true'

    await expect(guard.canActivate(context())).resolves.toBe(true)
    expect(verifyToken).not.toHaveBeenCalled()
  })

  it.each([
    ['production with the flag active', 'production', 'true'],
    ['development with the flag inactive', 'development', 'false'],
  ])('does not bypass Turnstile in %s', async (_case, appEnv, flag) => {
    process.env.APP_ENV = appEnv
    process.env.DISABLE_TURNSTILE = flag

    await expect(guard.canActivate(context())).rejects.toThrow(
      new UnauthorizedException('Turnstile::Missing challenge token')
    )
    expect(verifyToken).not.toHaveBeenCalled()
  })

  it('keeps normal server-side token verification when bypass is unavailable', async () => {
    process.env.APP_ENV = 'production'
    process.env.DISABLE_TURNSTILE = 'true'
    verifyToken.mockResolvedValue(true)

    await expect(guard.canActivate(context({
      'x-challenge-token': 'challenge-token',
      'x-client-ip': '127.0.0.1'
    }))).resolves.toBe(true)
    expect(verifyToken).toHaveBeenCalledWith('challenge-token', '127.0.0.1')
  })
})
