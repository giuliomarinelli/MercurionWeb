import helmet from '@fastify/helmet'
import type { BootstrapDependencies } from '../bootstrap.types'
import { registerRestContractVersioningHook } from '../../contracts/contract-versioning-http'
import { Environment } from '../../config/config.schema'

export async function configureSecurity(
  dependencies: Pick<BootstrapDependencies, 'app' | 'fastify' | 'env' | 'logger'>
): Promise<void> {
  dependencies.app.setGlobalPrefix('api', {
    exclude: ['/health', '/sitemap.xml', '/robots.txt', '/og/mercurion-og.png']
  })
  registerRestContractVersioningHook(dependencies.fastify, {
    isProduction: dependencies.env !== Environment.Development,
    logger: dependencies.logger
  })
  await dependencies.app.register(helmet, {
    contentSecurityPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: false
  })
  dependencies.fastify.addHook('onSend', (_req, reply, _payload, done) => {
    reply.header('Cache-Control', 'no-store')
    reply.header(
      'Permissions-Policy',
      [
        'geolocation=()', 'microphone=()', 'camera=()', 'payment=()',
        'usb=()', 'bluetooth=()', 'interest-cohort=()', 'fullscreen=(self)'
      ].join(', ')
    )
    done()
  })
}
