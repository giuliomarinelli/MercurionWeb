import { environment as developmentEnvironment } from './environment.development'
import { environment as productionEnvironment } from './environment'
import { assertValidEnvironmentConfig, EnvironmentConfig, EnvironmentName, environmentNames, LogLevel } from './environment.config'
import { environment as stagingEnvironment } from './environment.staging'
import { environment as testingEnvironment } from './environment.testing'

describe('Angular environment configuration', () => {
  const environments = [
    { config: developmentEnvironment, name: 'development', production: false, testing: false, minLogLevel: 'debug' },
    { config: testingEnvironment, name: 'testing', production: false, testing: true, minLogLevel: 'off' },
    { config: stagingEnvironment, name: 'staging', production: false, testing: false, minLogLevel: 'info' },
    { config: productionEnvironment, name: 'production', production: true, testing: false, minLogLevel: 'warn' }
  ] satisfies readonly {
    readonly config: EnvironmentConfig
    readonly name: EnvironmentName
    readonly production: boolean
    readonly testing: boolean
    readonly minLogLevel: LogLevel
  }[]

  it('defines every supported environment identity exactly once', () => {
    expect(environments.map(({ name }) => name)).toEqual([...environmentNames])
  })

  for (const { config, name, production, testing, minLogLevel } of environments) {
    it(`validates ${name} identity and derived booleans`, () => {
      expect(config.name).toBe(name)
      expect(config.production).toBe(production)
      expect(config.testing).toBe(testing)
      expect(config.minLogLevel).toBe(minLogLevel)
      expect(() => assertValidEnvironmentConfig(config)).not.toThrow()
    })
  }

  it('rejects contradictory production and testing flags', () => {
    const invalidEnvironment = {
      ...stagingEnvironment,
      production: true,
      testing: true
    } satisfies EnvironmentConfig

    expect(() => assertValidEnvironmentConfig(invalidEnvironment)).toThrowError(
      'Environment "staging" has inconsistent production flag'
    )
  })

  it('freezes environment objects and nested configuration collections', () => {
    expect(Object.isFrozen(productionEnvironment)).toBeTrue()
    expect(Object.isFrozen(productionEnvironment.PUBLIC_EXACT_PATHS)).toBeTrue()
    expect(Object.isFrozen(productionEnvironment.LOGGED_OUT_ONLY_PATHS)).toBeTrue()
    expect(Object.isFrozen(productionEnvironment.PUBLIC_PREFIXES)).toBeTrue()
    expect(Object.isFrozen(productionEnvironment.logoSrc)).toBeTrue()
  })
})
