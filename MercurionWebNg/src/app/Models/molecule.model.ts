export interface Molecule {
  id: number
  preferredName: string
  preferredNameIt: string
  mwFreebase: number
  smiles: string
  maxPhase?: number
  alogp?: number
}
