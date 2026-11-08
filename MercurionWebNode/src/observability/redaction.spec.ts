import { REDACTED_VALUE, redactSensitive } from './redaction'

describe('observability redaction', () => {
  it('redacts credentials and sensitive payload fields recursively', () => {
    const result = redactSensitive({
      email: 'not-a-secret-label',
      password: 'secret',
      nested: { accessToken: 'token', otp: '123456' },
      nats: { servers: ['nats://broker:4222'], user: 'synthetic-user', pass: 'synthetic-password' },
      list: [{ clientSecret: 'secret' }]
    })
    expect(result).toEqual({
      email: 'not-a-secret-label',
      password: REDACTED_VALUE,
      nested: { accessToken: REDACTED_VALUE, otp: REDACTED_VALUE },
      nats: { servers: ['nats://broker:4222'], user: 'synthetic-user', pass: REDACTED_VALUE },
      list: [{ clientSecret: REDACTED_VALUE }]
    })
  })
})
