import {
  CONTRACT_VERSION_HEADER,
  CURRENT_CONTRACT_MAJOR,
  PUBLIC_CONTRACT_VERSION_METADATA,
  contractVersionDetails,
  negotiateContractMajor,
  restMajorFromPath
} from '@mercurion/rest-contracts'

describe('public contract version negotiation', () => {
  it('accepts the current major and exposes the canonical range', () => {
    const result = negotiateContractMajor('1')
    expect(result).toEqual({ kind: 'supported', selectedMajor: CURRENT_CONTRACT_MAJOR })
    expect(PUBLIC_CONTRACT_VERSION_METADATA.currentMajor).toBe(CURRENT_CONTRACT_MAJOR)
    expect(PUBLIC_CONTRACT_VERSION_METADATA.supportedMajorRange).toEqual({ minimum: 1, maximum: 1 })
    expect(CONTRACT_VERSION_HEADER).toBe('x-mercurion-contract-major')
  })

  it('keeps the REST /api path as the legacy major-1 mapping', () => {
    const result = restMajorFromPath('/api/account/me')
    expect(result).toEqual({ kind: 'legacy-unversioned', selectedMajor: 1 })
    expect(contractVersionDetails(result)).toMatchObject({ legacyUnversioned: true, currentMajor: 1 })
  })

  it('distinguishes absent, malformed, unsupported, and deprecated selections', () => {
    expect(negotiateContractMajor(undefined).kind).toBe('legacy-unversioned')
    expect(negotiateContractMajor('01')).toEqual({ kind: 'invalid', code: 'CONTRACT_VERSION_INVALID' })
    expect(negotiateContractMajor('2')).toEqual({ kind: 'unsupported', code: 'CONTRACT_VERSION_UNSUPPORTED', selectedMajor: 2 })
    expect(negotiateContractMajor(['1'])).toEqual({ kind: 'invalid', code: 'CONTRACT_VERSION_INVALID' })
  })

  it('rejects non-integer and ambiguous values without coercion', () => {
    for (const value of [0, -1, 1.5, '1.0', '1,1', true, {}, '']) {
      expect(negotiateContractMajor(value).kind).toBe('invalid')
    }
  })
})
