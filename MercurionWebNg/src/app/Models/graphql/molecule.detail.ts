export interface MoleculeProperties {
    mwFreebase: number | null
    alogp: number | null
    hba: number | null
    hbd: number | null
    psa: number | null
    rtb: number | null
}


export interface AdministrationRoutes {
    oral: boolean
    parenteral: boolean
    topical: boolean
}

export interface MoleculeDetail {
    id: number
    cmbId: string
    preferredName: string
    canonicalSmiles: string
    properties: MoleculeProperties
    maxPhase: number | null
    moleculeType: string
    administrationRoutes: AdministrationRoutes
    naturalProduct: boolean
    prodrug: boolean
    blackBoxWarning: boolean
    synonyms: string[]
}
