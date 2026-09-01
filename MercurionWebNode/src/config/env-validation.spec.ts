import { validateEnv } from './env-validation'

describe('validateEnv', () => {
  it('throws instead of terminating the Jest process for invalid configuration', () => {
    expect(() => validateEnv({})).toThrow('Invalid environment configuration')
  })
})
