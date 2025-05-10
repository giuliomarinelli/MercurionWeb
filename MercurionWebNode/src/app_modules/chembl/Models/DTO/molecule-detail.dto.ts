export interface MoleculeDetailDTO {
  id: number
  cmbId: string
  preferredName: string
  canonicalSmiles: string
  properties: {
    mwFreebase: number | null
    alogp: number | null
    hba: number | null
    hbd: number | null
    psa: number | null
    rtb: number | null
  }
  maxPhase: number | null
  moleculeType: string
  administrationRoutes: {
    oral: boolean
    parenteral: boolean
    topical: boolean
  }
  naturalProduct: boolean
  prodrug: boolean
  blackBoxWarning: boolean
  synonyms: string[]
}
