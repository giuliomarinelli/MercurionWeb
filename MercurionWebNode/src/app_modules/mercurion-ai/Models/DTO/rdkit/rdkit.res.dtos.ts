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

export interface RdkitGetMoleculePropertiesWire {
  data?: RdkitGetMoleculePropertiesResult
  error?: string
}

export interface RdkitCanonicalSmilesWire {
  data?: string
  error?: string
}

export interface RdkitAreSameStructureWire {
  data?: boolean
  error?: string
}
