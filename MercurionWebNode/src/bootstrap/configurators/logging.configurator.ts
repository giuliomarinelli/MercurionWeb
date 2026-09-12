import type { LogLevel } from '@nestjs/common'
import { copyBootstrapFiles } from '../../copy-bootstrap-files'
import { Environment } from '../../config/config.schema'
import { resolveAppEnv } from '../../utils/env-helpers'
import type { BootstrapDependencies } from '../bootstrap.types'

export function getBootstrapLogLevels(env: Environment): LogLevel[] {
  const levels = new Set<LogLevel>([
    'error', 'warn', 'log', 'debug', 'verbose', 'fatal'
  ])
  if (env !== Environment.Development) {
    levels.delete('debug')
    levels.delete('verbose')
  }
  return Array.from(levels)
}

export function configureLogging(
  dependencies: Pick<BootstrapDependencies, 'env' | 'logger'>
): void {
  const levels = getBootstrapLogLevels(dependencies.env)
  dependencies.logger.setLogLevels(levels)
}

export function prepareDevelopmentBootstrap(): void {
  if (resolveAppEnv() === Environment.Development) {
    copyBootstrapFiles()
  }
}
