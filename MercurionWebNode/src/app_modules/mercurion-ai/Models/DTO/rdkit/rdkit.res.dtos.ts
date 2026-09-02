import type { RdkitGetMoleculePropertiesResult } from '@mercurion/rest-contracts'

export type { RdkitGetMoleculePropertiesResult }

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
