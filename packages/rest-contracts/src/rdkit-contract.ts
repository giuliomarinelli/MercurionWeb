export const RDKIT_SMILES_MAX_LENGTH = 4096 as const

export const RDKIT_OPERATIONS = Object.freeze({
  getMoleculeProperties: 'get_molecule_properties',
  toCanonicalSmiles: 'to_canonical_smiles',
  areSameStructure: 'are_same_structure'
} as const)

export type RdkitOperation = (typeof RDKIT_OPERATIONS)[keyof typeof RDKIT_OPERATIONS]

export interface RdkitToCanonicalSmilesOptsDTO {
  isomeric?: boolean
  kekule?: boolean
}

export interface RdkitBaseDTO {
  accessToken?: string
}

export interface RdkitAreSameStructureDTO extends RdkitBaseDTO {
  a: string
  b: string
}

export interface RdkitToCanonicalSmilesDTO extends RdkitBaseDTO {
  smiles: string
  opts?: RdkitToCanonicalSmilesOptsDTO
}

export interface RdkitGetMoleculePropertiesDTO extends RdkitBaseDTO {
  smiles: string
}

export interface RdkitGetMoleculePropertiesResult {
  mwFreebase: number | null
  alogp: number | null
  hba: number | null
  hbd: number | null
  psa: number | null
  rtb: number | null
}

export interface RdkitUpstreamError {
  error: string
  data?: never
}

export type RdkitGetMoleculePropertiesWire =
  | { data: RdkitGetMoleculePropertiesResult; error?: never }
  | RdkitUpstreamError

export type RdkitCanonicalSmilesWire =
  | { data: string; error?: never }
  | RdkitUpstreamError

export type RdkitAreSameStructureWire =
  | { data: boolean; error?: never }
  | RdkitUpstreamError

export type RdkitGetMoleculePropertiesResponse =
  | RdkitGetMoleculePropertiesResult
  | RdkitUpstreamError

export type RdkitToCanonicalSmilesResponse = string | RdkitUpstreamError
export type RdkitAreSameStructureResponse = boolean | RdkitUpstreamError
