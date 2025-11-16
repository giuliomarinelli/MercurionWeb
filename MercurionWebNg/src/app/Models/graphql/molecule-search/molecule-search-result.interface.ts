export interface MoleculeSearchResult {
  id: number
  preferredName: string
  preferredNameIt: string
  smiles?: string
  synonyms?: string[]
  mwFreebase?: number
  alogp?: number
  maxPhase?: number
  known: boolean
}
