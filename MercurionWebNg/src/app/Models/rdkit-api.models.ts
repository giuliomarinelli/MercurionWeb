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

export type RdkitGetMoleculePropertiesResponse =
  | RdkitGetMoleculePropertiesResult
  | { error: string }

export type RdkitToCanonicalSmilesResponse =
  | string
  | { error: string }

export type RdkitAreSameStructureResponse =
  | boolean
  | { error: string }
