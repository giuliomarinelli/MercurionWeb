import rateLimit from '@fastify/rate-limit'
import { randomBytes } from 'crypto'
import { buildRateLimitKey, routeAwareMax } from '../../config/rate-limit.config'
import type { BootstrapDependencies } from '../bootstrap.types'

export async function configureRateLimiting(
  dependencies: Pick<BootstrapDependencies, 'app' | 'redis'>
): Promise<void> {
  const requestIdSuffix = randomBytes(16).toString('hex')
  await dependencies.app.register(rateLimit, {
    hook: 'preHandler',
    timeWindow: 5 * 60 * 1000,
    keyGenerator: buildRateLimitKey,
    max: routeAwareMax,
    skipOnError: true,
    errorResponseBuilder: (req) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded.',
      timestamp: new Date().toISOString(),
      requestId: `${req.id}-${requestIdSuffix}`,
      path: req.url?.split('?')[0] || req.url
    }),
    redis: dependencies.redis.getClient(),
    nameSpace: 'ratelimit:'
  })
}
