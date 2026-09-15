import { LoggerPort } from './logger.port'

describe('LoggerPort', () => {
  it('defines a neutral contextual logging contract', () => {
    expect(LoggerPort).toBeDefined()
    expect(LoggerPort.prototype).toBeInstanceOf(Object)
  })
})
