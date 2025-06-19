export interface MoleculeSearchResult {
  id: number
  preferredName: string
  smiles?: string
  synonyms?: string[]
  mwFreebase?: number
  alogp?: number
  maxPhase?: number
}
