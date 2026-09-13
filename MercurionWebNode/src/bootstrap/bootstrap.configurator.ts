import type { BootstrapDependencies, BootstrapConfigurator } from './bootstrap.types'
import { configureLogging } from './configurators/logging.configurator'
import { configureTransport } from './configurators/transport.configurator'
import { configureSecurity } from './configurators/security.configurator'
import { configureValidation } from './configurators/validation.configurator'
import { configureCookiesAndRequestContext } from './configurators/cookies-request-context.configurator'
import { configureRateLimiting } from './configurators/rate-limit.configurator'
import { startApplication } from './configurators/startup.configurator'

export const bootstrapConfiguratorNames = [
  'logging',
  'transport',
  'security',
  'validation',
  'cookies-request-context',
  'rate-limiting',
  'startup'
] as const

export function createBootstrapConfigurators(): readonly BootstrapConfigurator[] {
  return [
    configureLogging,
    configureTransport,
    configureSecurity,
    configureValidation,
    configureCookiesAndRequestContext,
    configureRateLimiting,
    startApplication
  ]
}

export async function applyBootstrapConfiguration(
  dependencies: BootstrapDependencies,
  configurators: readonly BootstrapConfigurator[] = createBootstrapConfigurators()
): Promise<void> {
  for (const configurator of configurators) {
    await configurator(dependencies)
  }
}
