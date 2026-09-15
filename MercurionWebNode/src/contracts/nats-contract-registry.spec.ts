import {
  NATS_CONTRACT_REGISTRY,
  NATS_CONTRACT_VERSION,
  NATS_TIMEOUT_MS,
  natsSubject
} from '@mercurion/rest-contracts'

describe('NATS contract registry', () => {
  it('contains one versioned contract for every scientific RPC operation', () => {
    expect(Object.keys(NATS_CONTRACT_REGISTRY)).toEqual([
      'inferenceTop4',
      'rdkitGetMoleculeProperties',
      'rdkitToCanonicalSmiles',
      'rdkitAreSameStructure'
    ])

    for (const entry of Object.values(NATS_CONTRACT_REGISTRY)) {
      expect(entry.version).toBe(NATS_CONTRACT_VERSION)
      expect(entry.timeoutMs).toBe(NATS_TIMEOUT_MS)
      expect(entry.timeoutPolicyKey).toBe('scientific-rpc')
      expect(entry.error.wireShape).toBe('error-string')
    }
  })

  it.each([
    ['inferenceTop4', 'development', 'development.inference.tox21.smiles', 'inference.tox21.smiles'],
    ['rdkitGetMoleculeProperties', 'test', 'test.rdkit_api.get_molecule_properties', 'rdkit_api.get_molecule_properties'],
    ['rdkitToCanonicalSmiles', 'staging', 'staging.rdkit_api.to_canonical_smiles', 'rdkit_api.to_canonical_smiles'],
    ['rdkitAreSameStructure', 'production', 'rdkit_api.are_same_structure', 'rdkit_api.are_same_structure']
  ] as const)('derives %s subject centrally', (contractId, environment, expected, productionExpected) => {
    expect(natsSubject(contractId, environment)).toBe(expected)
    expect(natsSubject(contractId, 'production')).toBe(productionExpected)
  })

  it('accepts the wire shape emitted by the current Tox21 peer', () => {
    const inference = NATS_CONTRACT_REGISTRY.inferenceTop4
    const rdkit = NATS_CONTRACT_REGISTRY.rdkitGetMoleculeProperties

    expect(inference.request({
      smiles: 'CCO',
      accessToken: 'a'.repeat(10)
    })).toBe(true)
    expect(inference.response({
      'SR-p53': { probability: 0.25, threshold: 0.5, is_positive: false }
    })).toBe(true)
    expect(inference.response({ error: 'Invalid or expired access token' })).toBe(true)

    expect(rdkit.request({
      smiles: 'CCO',
      accessToken: 'a'.repeat(10)
    })).toBe(true)
    expect(rdkit.response({
      data: {
        mwFreebase: 46.069,
        alogp: -0.001,
        hba: 1,
        hbd: 1,
        psa: 20.23,
        rtb: 0
      }
    })).toBe(true)
  })

  it('rejects malformed requests and responses before service-specific mapping', () => {
    const inference = NATS_CONTRACT_REGISTRY.inferenceTop4
    const rdkit = NATS_CONTRACT_REGISTRY.rdkitAreSameStructure

    expect(inference.request({ smiles: '', accessToken: 'short' })).toBe(false)
    expect(inference.request({ smiles: 'CCO', accessToken: 'a'.repeat(10), extra: true })).toBe(false)
    expect(inference.response({ 'SR-p53': { probability: '0.5' } })).toBe(false)
    expect(rdkit.response({ data: { unexpected: true } })).toBe(false)
    expect(rdkit.response({ error: '' })).toBe(false)
  })
})
