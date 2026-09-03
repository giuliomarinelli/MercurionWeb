import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import {
  RDKIT_OPERATIONS,
  RDKIT_SMILES_MAX_LENGTH,
  type RdkitAreSameStructureWire,
  type RdkitCanonicalSmilesWire,
  type RdkitGetMoleculePropertiesWire
} from '@mercurion/rest-contracts'
import { RdkitAreSameStructureDTO } from '../app_modules/mercurion-ai/Models/DTO/rdkit/rdkit-are-same-structures.dto'
import { RdkitGetMoleculePropertiesDTO } from '../app_modules/mercurion-ai/Models/DTO/rdkit/rdkit-get-molecule-properties.cls.dto'
import { RdkitToCanonicalSmilesDTO } from '../app_modules/mercurion-ai/Models/DTO/rdkit/rdkit-canonical-smiles.dto'

type RdkitRequestDto =
  | RdkitAreSameStructureDTO
  | RdkitGetMoleculePropertiesDTO
  | RdkitToCanonicalSmilesDTO

const invalidRequests: Array<[new () => RdkitRequestDto, object]> = [
  [RdkitGetMoleculePropertiesDTO, { smiles: '   ' }],
  [RdkitGetMoleculePropertiesDTO, { smiles: 'C'.repeat(RDKIT_SMILES_MAX_LENGTH + 1) }],
  [RdkitToCanonicalSmilesDTO, { smiles: 42 }],
  [RdkitToCanonicalSmilesDTO, { smiles: 'CCO', opts: { isomeric: 'true' } }],
  [RdkitAreSameStructureDTO, { a: 'CCO', b: '  ' }]
]

describe('RDKit REST contract runtime parity', () => {
  it('accepts and normalizes documented molecule-properties requests', async () => {
    const dto = plainToInstance(RdkitGetMoleculePropertiesDTO, { smiles: ' CCO ' })

    expect(await validate(dto)).toEqual([])
    expect(dto.smiles).toBe('CCO')
  })

  it.each(invalidRequests)('rejects invalid RDKit request input', async (Dto, input) => {
    const errors = await validate(plainToInstance<RdkitRequestDto, object>(Dto, input))

    expect(errors.length).toBeGreaterThan(0)
  })

  it('keeps the molecule-properties upstream result wire-compatible', () => {
    const wire: RdkitGetMoleculePropertiesWire = {
      data: {
        mwFreebase: 46.069,
        alogp: -0.001,
        hba: 1,
        hbd: 1,
        psa: 20.23,
        rtb: 0
      }
    }

    expect(wire.data?.mwFreebase).toBe(46.069)
  })

  it('keeps canonical-smiles and same-structure result wires compatible', () => {
    const canonical: RdkitCanonicalSmilesWire = { data: 'CCO' }
    const sameStructure: RdkitAreSameStructureWire = { data: true }

    expect(canonical.data).toBe('CCO')
    expect(sameStructure.data).toBe(true)
  })

  it.each([
    [{ error: 'invalid molecule' }],
    [{ error: 'invalid molecule' }],
    [{ error: 'invalid molecule' }]
  ])('represents upstream RDKit errors without inventing a result', (wire) => {
    expect(wire.error).toBe('invalid molecule')
    expect('data' in wire).toBe(false)
  })

  it('defines every exposed RDKit operation once', () => {
    expect(Object.values(RDKIT_OPERATIONS)).toEqual([
      'get_molecule_properties',
      'to_canonical_smiles',
      'are_same_structure'
    ])
  })
})
