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