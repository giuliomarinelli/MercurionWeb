import fastifyCookie from '@fastify/cookie'
import { randomUUID } from 'crypto'
import type { BootstrapDependencies } from '../bootstrap.types'
import type { SecureCookieConfiguration } from '../../config/config.types'
import { isValidIp } from '../../config/rate-limit.config'
import { Environment } from '../../config/config.schema'

export async function configureCookiesAndRequestContext(
  dependencies: Pick<BootstrapDependencies, 'app' | 'fastify' | 'config' | 'env' | 'secureCookie'>
): Promise<void> {
  await dependencies.app.register(fastifyCookie)
  const { secret, ...cookieOptions } =
    dependencies.config.get<SecureCookieConfiguration>('SecureCookie')!
  void secret

  // This hook must run before session consumers and before rate limiting.
  dependencies.fastify.addHook('onRequest', (req, reply, done) => {
    req.headers['x-device-id'] = undefined
    req.headers['x-session-id'] = undefined
    req.headers['x-client-ip'] = undefined
    req.headers['x-user-id'] = undefined
    req.headers['x-scopes'] = undefined
    req.headers['x-new-access-token'] = undefined

    let deviceId: string | null
    try {
      deviceId = dependencies.secureCookie.getSignedCookie(req, '__device_id')
    } catch {
      deviceId = randomUUID()
      dependencies.secureCookie.setSignedCookie(reply, '__device_id', deviceId, {
        maxAge: 31_556_952,
        ...cookieOptions
      })
    }
    req.headers['x-device-id'] = deviceId

    try {
      req.headers['x-session-id'] =
        dependencies.secureCookie.getSignedCookie(req, '__node_session_id')
    } catch {
      req.headers['x-session-id'] = undefined
    }

    const mockIp = req.headers['x-mock-ip']?.toString().trim()
    const cfIpRaw = req.headers['cf-connecting-ip']?.toString().trim()
    const cfIp = isValidIp(cfIpRaw) ? cfIpRaw : undefined
    const localRequest = dependencies.env === Environment.Development ||
      dependencies.env === Environment.Test
    req.headers['x-client-ip'] =
      localRequest && mockIp ? mockIp : (cfIp || req.ip)
    done()
  })

  dependencies.fastify.addContentTypeParser(
    'multipart/form-data',
    (req, _payload, done) => done(null, req)
  )
}
