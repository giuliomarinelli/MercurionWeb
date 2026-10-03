import { plainToInstance } from 'class-transformer'
import { RdkitToCanonicalSmilesDTO } from '../app_modules/mercurion-ai/models/dto/rdkit/rdkit-canonical-smiles.dto'
import {
  NATS_CONTRACT_REGISTRY,
  NATS_CONTRACT_VERSION,
  NATS_TIMEOUT_MS,
  natsSubject,
  type PcpGetIupacNameFromSmilesDTO,
  type PcpGetIupacNameFromSmilesWire
} from '@mercurion/rest-contracts'

describe('NATS contract registry', () => {
  it('contains one versioned contract for every scientific RPC operation', () => {
    expect(Object.keys(NATS_CONTRACT_REGISTRY)).toEqual([
      'inferenceTop4',
      'rdkitGetMoleculeProperties',
      'rdkitToCanonicalSmiles',
      'rdkitAreSameStructure',
      'pcpGetIupacNameFromSmiles'
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
    ['rdkitAreSameStructure', 'production', 'rdkit_api.are_same_structure', 'rdkit_api.are_same_structure'],
    ['pcpGetIupacNameFromSmiles', 'development', 'development.pcp_api.get_iupac_name_from_smiles', 'pcp_api.get_iupac_name_from_smiles']
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
    expect(inference.request({ smiles: 'C'.repeat(1025), accessToken: 'a'.repeat(10) })).toBe(false)
    expect(inference.request({ smiles: 'CCO', accessToken: 'a'.repeat(4097) })).toBe(false)
    expect(inference.request({ smiles: 'CCO', accessToken: 'a'.repeat(10), extra: true })).toBe(false)
    expect(inference.response({ 'SR-p53': { probability: '0.5' } })).toBe(false)
    expect(inference.response({})).toBe(false)
    expect(inference.response({ error: 'peer failure', data: true })).toBe(false)
    expect(rdkit.response({ data: { unexpected: true } })).toBe(false)
    expect(rdkit.response({ data: {
      mwFreebase: '46.069', alogp: 0, hba: 1, hbd: 1, psa: 20, rtb: 0
    } })).toBe(false)
    expect(rdkit.response({ error: '' })).toBe(false)
  })

  it('accepts the PubChem request and nested IUPAC response emitted by Tox21', () => {
    const pcp = NATS_CONTRACT_REGISTRY.pcpGetIupacNameFromSmiles
    const request: PcpGetIupacNameFromSmilesDTO = { smiles: 'CCO', accessToken: 'a'.repeat(10) }
    const response: PcpGetIupacNameFromSmilesWire = { data: { iupac_name: 'ethanol' } }

    expect(pcp.request(request)).toBe(true)
    expect(pcp.response(response)).toBe(true)
    expect(pcp.response({ data: { iupac_name: '' } })).toBe(true)
    expect(pcp.response({ error: 'InternalError' })).toBe(true)
    for (const data of ['ethanol', true, {}, { iupac_name: null }, { iupac_name: 'ethanol', extra: true }]) {
      expect(pcp.response({ data })).toBe(false)
    }
    expect(pcp.response({ data: { iupac_name: 'ethanol' }, error: 'InternalError' })).toBe(false)
  })

  it.each(['inferenceTop4', 'rdkitGetMoleculeProperties', 'rdkitToCanonicalSmiles', 'pcpGetIupacNameFromSmiles'] as const)(
    'enforces the Pydantic string bounds and required fields for %s', (contractId) => {
      const entry = NATS_CONTRACT_REGISTRY[contractId]
      const valid = { smiles: 'CCO', accessToken: 'a'.repeat(10) }

      expect(entry.request({ ...valid, smiles: 'C'.repeat(1024) })).toBe(true)
      expect(entry.request({ ...valid, smiles: 'C'.repeat(1025) })).toBe(false)
      expect(entry.request({ ...valid, smiles: ' ' })).toBe(false)
      expect(entry.request({ ...valid, smiles: 123 })).toBe(false)
      expect(entry.request({ ...valid, accessToken: 'a'.repeat(4096) })).toBe(true)
      expect(entry.request({ ...valid, accessToken: 'a'.repeat(4097) })).toBe(false)
      expect(entry.request({ smiles: 'CCO' })).toBe(true)
      expect(entry.request({ accessToken: valid.accessToken })).toBe(false)
      expect(entry.request({ ...valid, extra: true })).toBe(false)
      expect(entry.request({ smiles: ` ${'C'.repeat(1024)} `, accessToken: ` ${'a'.repeat(4096)} ` })).toBe(true)
      expect(entry.request({ ...valid, accessToken: ' short ' })).toBe(true)
      expect(entry.request({ ...valid, a: 'CCO' })).toBe(false)
    }
  )

  it.each(Object.keys(NATS_CONTRACT_REGISTRY) as Array<keyof typeof NATS_CONTRACT_REGISTRY>)(
    'accepts public requests with missing, undefined or empty tokens for %s', (contractId) => {
      const entry = NATS_CONTRACT_REGISTRY[contractId]
      const payload = contractId === 'rdkitAreSameStructure' ? { a: 'CCO', b: 'OCC' } : { smiles: 'CCO' }
      expect(entry.request(payload)).toBe(true)
      for (const accessToken of [undefined, '', ' ', 'expired-token']) {
        expect(entry.request({ ...payload, accessToken })).toBe(true)
      }
      for (const accessToken of [null, 123, false, [], {}, 'x'.repeat(4097)]) {
        expect(entry.request({ ...payload, accessToken })).toBe(false)
      }
      expect(entry.requestSchema.required).not.toContain('accessToken')
      expect(entry.requestSchema.properties?.accessToken).toEqual({ type: 'string', minLength: 0, maxLength: 4096 })
    }
  )

  it.each(['rdkitGetMoleculeProperties', 'pcpGetIupacNameFromSmiles'] as const)(
    'rejects canonicalization options on %s', (contractId) => {
      expect(NATS_CONTRACT_REGISTRY[contractId].request({
        smiles: 'CCO', accessToken: 'a'.repeat(10), opts: {}
      })).toBe(false)
    }
  )

  it('validates both structure-comparison inputs', () => {
    const entry = NATS_CONTRACT_REGISTRY.rdkitAreSameStructure
    const valid = { a: 'CCO', b: 'OCC', accessToken: 'a'.repeat(10) }
    expect(entry.request(valid)).toBe(true)
    for (const field of ['a', 'b']) {
      for (const value of [null, 123, '', ' ', 'C'.repeat(1025)]) {
        expect(entry.request({ ...valid, [field]: value })).toBe(false)
      }
      expect(entry.request({ ...valid, [field]: ` ${'C'.repeat(1024)} ` })).toBe(true)
    }
    expect(entry.request({ ...valid, opts: {} })).toBe(false)
    expect(entry.request({ ...valid, smiles: 'CCO' })).toBe(false)
  })

  it('accepts optional or null canonical options and strictly validates explicit options', () => {
    const entry = NATS_CONTRACT_REGISTRY.rdkitToCanonicalSmiles
    const valid = { smiles: 'CCO', accessToken: 'a'.repeat(10) }
    for (const opts of [null, {}, { isomeric: false }, { kekule: true }, { isomeric: false, kekule: true }]) {
      expect(entry.request({ ...valid, opts })).toBe(true)
    }
    for (const opts of [[], false, 0, '', { unknown: true }, { isomeric: 'false' }, { kekule: 1 }, { isomeric: null }]) {
      expect(entry.request({ ...valid, opts })).toBe(false)
    }
  })

  it('accepts transformed Nest canonical DTOs with default options omitted from the JSON wire', () => {
    for (const opts of [{}, { isomeric: false }, { kekule: true }]) {
      const dto = plainToInstance(RdkitToCanonicalSmilesDTO, {
        smiles: 'CCO', accessToken: 'a'.repeat(10), opts
      })
      expect(NATS_CONTRACT_REGISTRY.rdkitToCanonicalSmiles.request(dto)).toBe(true)
    }
  })

  it('rejects result shapes belonging to a different RDKit operation', () => {
    const properties = { mwFreebase: 46.069, alogp: 0, hba: 1, hbd: 1, psa: 20, rtb: 0 }
    expect(NATS_CONTRACT_REGISTRY.rdkitGetMoleculeProperties.response({ data: 'CCO' })).toBe(false)
    expect(NATS_CONTRACT_REGISTRY.rdkitGetMoleculeProperties.response({ data: true })).toBe(false)
    expect(NATS_CONTRACT_REGISTRY.rdkitToCanonicalSmiles.response({ data: true })).toBe(false)
    expect(NATS_CONTRACT_REGISTRY.rdkitToCanonicalSmiles.response({ data: properties })).toBe(false)
    expect(NATS_CONTRACT_REGISTRY.rdkitAreSameStructure.response({ data: 'CCO' })).toBe(false)
    expect(NATS_CONTRACT_REGISTRY.rdkitAreSameStructure.response({ data: properties })).toBe(false)
    expect(NATS_CONTRACT_REGISTRY.rdkitToCanonicalSmiles.response({ data: 'CCO' })).toBe(true)
    expect(NATS_CONTRACT_REGISTRY.rdkitAreSameStructure.response({ data: false })).toBe(true)
    expect(NATS_CONTRACT_REGISTRY.rdkitGetMoleculeProperties.response({
      data: { ...properties, alogp: null }
    })).toBe(true)
    expect(NATS_CONTRACT_REGISTRY.rdkitGetMoleculeProperties.response({
      data: { ...properties, mwFreebase: Infinity }
    })).toBe(false)
  })
})
