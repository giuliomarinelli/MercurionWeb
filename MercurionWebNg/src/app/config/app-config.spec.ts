import { TestBed } from '@angular/core/testing'
import packageJson from '../../../package.json'
import { environment as developmentEnvironment } from '../../environments/environment.development'
import { environment as productionEnvironment } from '../../environments/environment'
import { environment as stagingEnvironment } from '../../environments/environment.staging'
import { environment as testingEnvironment } from '../../environments/environment.testing'
import type { EnvironmentConfig, EnvironmentName } from '../../environments/environment.config'
import { environmentNames } from '../../environments/environment.config'
import { RealtimeSocketService } from '../services/socket.IO/realtime-socket.service'
import { APP_CONFIG, AppConfig, RELEASE_BASE_VERSION, createAppConfig, releaseVersionFor } from './app-config'

describe('Application configuration', () => {
  const environments = [
    { config: developmentEnvironment, name: 'development', beta: true, feedbackEnv: 'staging', version: '1.0.0d' },
    { config: testingEnvironment, name: 'testing', beta: true, feedbackEnv: 'staging', version: '1.0.0i' },
    { config: stagingEnvironment, name: 'staging', beta: true, feedbackEnv: 'staging', version: '1.0.0-beta' },
    { config: productionEnvironment, name: 'production', beta: false, feedbackEnv: 'prod', version: '1.0.0' }
  ] satisfies readonly {
    readonly config: EnvironmentConfig
    readonly name: EnvironmentName
    readonly beta: boolean
    readonly feedbackEnv: 'staging' | 'prod'
    readonly version: string
  }[]

  it('uses the package manifest as the single release-version source', () => {
    expect(RELEASE_BASE_VERSION).toBe(packageJson.version)
  })

  it('maps every supported environment to a valid application config', () => {
    expect(environments.map(({ name }) => name)).toEqual([...environmentNames])

    for (const { config, name, beta, feedbackEnv, version } of environments) {
      const appConfig = createAppConfig(config)

      expect(appConfig.environment).toBe(name)
      expect(appConfig.production).toBe(config.production)
      expect(appConfig.testing).toBe(config.testing)
      expect(appConfig.capabilities.beta).toBe(beta)
      expect(appConfig.capabilities.feedbackEnv).toBe(feedbackEnv)
      expect(appConfig.release.version).toBe(version)
      expect(appConfig.release.version).toBe(releaseVersionFor(name))
      expect(appConfig.endpoints.realtimeUrl).toBe('/')
      expect(appConfig.endpoints.realtimePath).toBe('/socket.io')
      expect(appConfig.integrations.turnstileSiteKey).toBe(config.CLOUDFLARE_SITE_KEY)
    }
  })

  it('freezes the configuration and its groups', () => {
    const appConfig = createAppConfig(productionEnvironment)

    expect(Object.isFrozen(appConfig)).toBeTrue()
    expect(Object.isFrozen(appConfig.endpoints)).toBeTrue()
    expect(Object.isFrozen(appConfig.capabilities)).toBeTrue()
    expect(Object.isFrozen(appConfig.release)).toBeTrue()
    expect(Object.isFrozen(appConfig.integrations)).toBeTrue()
  })

  it('provides the configuration of the selected build environment through DI', () => {
    const appConfig = TestBed.inject(APP_CONFIG)

    expect(environmentNames).toContain(appConfig.environment)
    expect(appConfig.release.version).toBe(releaseVersionFor(appConfig.environment))
  })

  it('keeps browser configuration free of secret-looking values', () => {
    const appConfig = createAppConfig(productionEnvironment)

    expect(JSON.stringify(appConfig)).not.toMatch(/secret|password|private[_-]?key/i)
  })
})

describe('Application configuration consumers', () => {
  it('connects the realtime socket through the configured same-origin endpoint', () => {
    const appConfig: AppConfig = {
      ...createAppConfig(developmentEnvironment),
      endpoints: { realtimeUrl: '/', realtimePath: '/socket.io' }
    }

    TestBed.configureTestingModule({
      providers: [{ provide: APP_CONFIG, useValue: appConfig }]
    })

    const service = TestBed.inject(RealtimeSocketService)
    const socket = (service as unknown as { socket: { io: { opts: { path: string } } } }).socket

    expect(socket.io.opts.path).toBe('/socket.io')
  })
})
