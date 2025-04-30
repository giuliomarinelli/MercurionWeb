export interface Molecule {
  id: number
  preferredName: string
  mwFreebase: number
  smiles: string
  maxPhase?: number
  alogp?: number
}
