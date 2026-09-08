import {
  CONTRACT_VERSION_HEADER,
  CONTRACT_VERSION_RESPONSE_HEADERS,
  CURRENT_CONTRACT_MAJOR,
  PUBLIC_CONTRACT_VERSION_METADATA,
  contractVersionDetails,
  contractVersionWarning,
  formatSupportedMajorRange,
  negotiateContractMajor,
  negotiateContractMajorForPolicy,
  restMajorFromPath
} from '@mercurion/rest-contracts'

describe('public contract version negotiation', () => {
  it('accepts the current major and exposes the canonical range', () => {
    const result = negotiateContractMajor('1')
    expect(result).toEqual({ kind: 'supported', selectedMajor: CURRENT_CONTRACT_MAJOR })
    expect(PUBLIC_CONTRACT_VERSION_METADATA.currentMajor).toBe(CURRENT_CONTRACT_MAJOR)
    expect(PUBLIC_CONTRACT_VERSION_METADATA.supportedMajorRange).toEqual({ minimum: 1, maximum: 1 })
    expect(CONTRACT_VERSION_HEADER).toBe('x-mercurion-contract-major')
    expect(CONTRACT_VERSION_RESPONSE_HEADERS).toEqual({
      currentMajor: 'x-mercurion-contract-current-major',
      supportedMajorRange: 'x-mercurion-contract-supported-range'
    })
    expect(formatSupportedMajorRange(PUBLIC_CONTRACT_VERSION_METADATA.supportedMajorRange)).toBe('1-1')
  })

  it('keeps the REST /api path as the legacy major-1 mapping', () => {
    const result = restMajorFromPath('/api/account/me')
    expect(result).toEqual({ kind: 'legacy-unversioned', selectedMajor: 1 })
    expect(contractVersionDetails(result)).toMatchObject({ legacyUnversioned: true, currentMajor: 1 })
  })

  it('distinguishes absent, malformed, and unsupported selections', () => {
    expect(negotiateContractMajor(undefined).kind).toBe('legacy-unversioned')
    expect(negotiateContractMajor('01')).toEqual({ kind: 'invalid', code: 'CONTRACT_VERSION_INVALID' })
    expect(negotiateContractMajor('2')).toEqual({ kind: 'unsupported', code: 'CONTRACT_VERSION_UNSUPPORTED', selectedMajor: 2 })
    expect(negotiateContractMajor(['1'])).toEqual({ kind: 'invalid', code: 'CONTRACT_VERSION_INVALID' })
  })

  it('exposes representative deprecation metadata and a safe warning', () => {
    const deprecation = {
      deprecatedInMajor: 1,
      reason: 'Use the additive replacement',
      deprecatedAt: '2026-09-08T12:53:13.845Z',
      replacement: 'major 2',
      removeNoEarlierThanMajor: 3,
      approvalAuthority: 'Giulio Marinelli'
    } as const
    const policy = {
      currentMajor: 2,
      supportedMajorRange: { minimum: 1, maximum: 2 },
      deprecations: [deprecation]
    } as const

    const result = negotiateContractMajorForPolicy('1', policy)

    expect(result).toEqual({ kind: 'deprecated', selectedMajor: 1, deprecation })
    expect(contractVersionDetails(result, policy)).toMatchObject({
      selectedMajor: 1,
      currentMajor: 2,
      supportedMajorRange: { minimum: 1, maximum: 2 },
      deprecation
    })
    expect(contractVersionWarning(result)).toBe(
      '299 - "contract major 1 deprecated: Use the additive replacement"'
    )
  })

  it('rejects non-integer and ambiguous values without coercion', () => {
    for (const value of [0, -1, 1.5, '1.0', '1,1', true, {}, '']) {
      expect(negotiateContractMajor(value).kind).toBe('invalid')
    }
  })
})
