import { Environment } from '../config/config.schema'
import {
  applyBootstrapConfiguration,
  bootstrapConfiguratorNames,
  createBootstrapConfigurators
} from './bootstrap.configurator'
import { getBootstrapLogLevels } from './configurators/logging.configurator'

describe('bootstrap configurator composition', () => {
  it('keeps infrastructure concerns in their required order', () => {
    expect(bootstrapConfiguratorNames).toEqual([
      'logging',
      'transport',
      'security',
      'validation',
      'cookies-request-context',
      'rate-limiting',
      'startup'
    ])
    expect(createBootstrapConfigurators()).toHaveLength(
      bootstrapConfiguratorNames.length
    )
  })

  it('applies configurators sequentially', async () => {
    const calls: string[] = []
    const dependencies = {} as Parameters<typeof applyBootstrapConfiguration>[0]
    const configurators = [
      async () => { calls.push('first') },
      async () => { calls.push('second') }
    ]
    await applyBootstrapConfiguration(dependencies, configurators)

    expect(calls).toEqual(['first', 'second'])
  })

  it('removes verbose logging outside development', () => {
    expect(getBootstrapLogLevels(Environment.Development)).toEqual([
      'error', 'warn', 'log', 'debug', 'verbose', 'fatal'
    ])
    expect(getBootstrapLogLevels(Environment.Production)).toEqual([
      'error', 'warn', 'log', 'fatal'
    ])
  })
})
