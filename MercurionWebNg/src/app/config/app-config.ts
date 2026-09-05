import { InjectionToken } from '@angular/core'
import type { FeedbackEnv } from '@mercurion/rest-contracts'
import { environment } from '../../environments/environment'


/** Canonical environment contract, taken from the single allowed environment entry point. */
export type EnvironmentConfig = typeof environment
export type EnvironmentName = EnvironmentConfig['name']
export type LogLevel = EnvironmentConfig['minLogLevel']

/**
 * Single source of truth for the released client version. Environment variants
 * qualify this base version through {@link RELEASE_CHANNEL_SUFFIXES}; they never
 * declare an independent version string.
 */
export const RELEASE_BASE_VERSION = '1.0.0'

const RELEASE_CHANNEL_SUFFIXES = {
  development: 'd',
  testing: 'i',
  staging: '-beta',
  production: ''
} as const satisfies Record<EnvironmentName, string>

/** Same-origin realtime endpoint: the browser always reaches Socket.IO through the serving origin. */
const REALTIME_ORIGIN = '/'
const REALTIME_PATH = '/socket.io'

export interface AppEndpointsConfig {
  readonly realtimeUrl: string
  readonly realtimePath: string
}

export interface AppCapabilitiesConfig {
  readonly beta: boolean
  readonly feedbackEnv: FeedbackEnv
}

export interface AppReleaseConfig {
  readonly version: string
}

export interface AppPublicIntegrationsConfig {
  readonly turnstileSiteKey: string
}

export interface AppLoggingConfig {
  readonly minLevel: LogLevel
}

export interface AppConfig {
  readonly environment: EnvironmentName
  readonly production: boolean
  readonly testing: boolean
  readonly endpoints: AppEndpointsConfig
  readonly capabilities: AppCapabilitiesConfig
  readonly release: AppReleaseConfig
  readonly integrations: AppPublicIntegrationsConfig
  readonly logging: AppLoggingConfig
}

export function releaseVersionFor(name: EnvironmentName): string {
  return `${RELEASE_BASE_VERSION}${RELEASE_CHANNEL_SUFFIXES[name]}`
}

/**
 * Derives the canonical application configuration from the selected build environment.
 * Feature code depends on this boundary instead of raw environment fields.
 */
export function createAppConfig(config: EnvironmentConfig): AppConfig {
  return Object.freeze({
    environment: config.name,
    production: config.production,
    testing: config.testing,
    endpoints: Object.freeze({
      realtimeUrl: REALTIME_ORIGIN,
      realtimePath: REALTIME_PATH
    }),
    capabilities: Object.freeze({
      beta: !config.production,
      feedbackEnv: (config.production ? 'prod' : 'staging') satisfies FeedbackEnv
    }),
    release: Object.freeze({
      version: releaseVersionFor(config.name)
    }),
    integrations: Object.freeze({
      turnstileSiteKey: config.CLOUDFLARE_SITE_KEY
    }),
    logging: Object.freeze({
      minLevel: config.minLogLevel
    })
  } satisfies AppConfig)
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => createAppConfig(environment)
})

