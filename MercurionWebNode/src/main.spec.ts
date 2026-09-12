import {
  ConfigurationError
} from './config/env-validation'
import {
  reportBootstrapFailure,
  runBootstrap
} from './main'

describe('application bootstrap failure handling', () => {
  const originalExitCode = process.exitCode

  afterEach(() => {
    process.exitCode = originalExitCode
    jest.restoreAllMocks()
  })

  it('leaves a successful bootstrap with a successful process result', async () => {
    process.exitCode = undefined
    const report = jest.fn()
    const exit = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`unexpected process.exit(${String(code)})`)
    })

    await runBootstrap(async () => undefined, report)

    expect(report).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
    expect(process.exitCode).toBeUndefined()
  })

  it('reports typed configuration failure and leaves a non-zero process result', async () => {
    process.exitCode = undefined
    const failure = new ConfigurationError([{
      source: 'APP_PORT',
      message: 'is required'
    }])
    const report = jest.fn()
    const exit = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`unexpected process.exit(${String(code)})`)
    })

    await runBootstrap(async () => {
      throw failure
    }, report)

    expect(report).toHaveBeenCalledWith(failure)
    expect(exit).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('prints structured safe configuration diagnostics', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    const failure = new ConfigurationError([{
      source: 'APP_PORT',
      message: 'is required'
    }])

    reportBootstrapFailure(failure)

    expect(consoleError).toHaveBeenCalledWith('[CONFIGURATION_ERROR]', {
      code: 'INVALID_CONFIGURATION',
      diagnostics: [{
        source: 'APP_PORT',
        message: 'is required'
      }]
    })
  })
})
