import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NATS_CONTRACT_REGISTRY, natsSubject } from '@mercurion/rest-contracts'

interface WireCase {
  operation: keyof typeof NATS_CONTRACT_REGISTRY
  subject: string
  request: Record<string, unknown>
  response: Record<string, unknown>
}

interface WireFixture {
  fixture_version: number
  environments: string[]
  cases: WireCase[]
}

// Identical synthetic fixture is exercised by Python handlers in Tox21.
// It is vendored here so ordinary Web CI never needs a sibling checkout.
const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'tox21-wire.json'), 'utf8')
) as WireFixture

describe('Tox21 Python/Web wire fixture', () => {
  it('covers the five registered operations and four supported environments', () => {
    expect(fixture.fixture_version).toBe(1)
    expect(fixture.cases.map(entry => entry.operation)).toEqual(Object.keys(NATS_CONTRACT_REGISTRY))
    expect(fixture.environments).toEqual(['development', 'test', 'staging', 'production'])
  })

  it.each(fixture.cases)('accepts Python $operation requests and responses', entry => {
    const contract = NATS_CONTRACT_REGISTRY[entry.operation]
    expect(contract.baseSubject).toBe(entry.subject)
    expect(contract.request(entry.request)).toBe(true)
    expect(contract.response(entry.response)).toBe(true)
    expect(contract.response({ error: 'InternalError' })).toBe(true)
  })

  it.each(fixture.environments)('derives the same subjects as Python for %s', environment => {
    for (const entry of fixture.cases) {
      const expected = environment === 'production' ? entry.subject : `${environment}.${entry.subject}`
      expect(natsSubject(entry.operation, environment)).toBe(expected)
    }
  })
})
