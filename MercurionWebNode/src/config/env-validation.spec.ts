import { validateEnvOrKillProcess } from './env-validation'

describe('validateEnv', () => {
  it('throws instead of terminating the Jest process for invalid configuration', () => {
    expect(() => validateEnvOrKillProcess({})).toThrow('Invalid environment configuration')
  })
})
