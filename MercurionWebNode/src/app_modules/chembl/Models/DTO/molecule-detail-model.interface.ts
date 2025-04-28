export interface MoleculeDetailModel {
    id: number
    cmbId: string
    preferredName: string
    canonicalSmiles: string
    standardInchi: string
    standardInchiKey: string
    molFormula: string
    properties: {
        mwFreebase: number | null
        alogp: number | null
        hba: number | null
        hbd: number | null
        psa: number | null
        rtb: number | null
    };
    maxPhase: number | null
    moleculeType: string
    administrationRoutes: {
        oral: boolean
        parenteral: boolean
        topical: boolean
    };
    naturalProduct: boolean
    prodrug: boolean
    blackBoxWarning: boolean
    synonyms: string[] // split dal GROUP_CONCAT
    activities: {
        actionType: string
        value: number | null
        unit: string;
        assayDescription: string
        targetName: string
        targetOrganism: string
    }[]
    toxicityData: {
        warningType: string
        warningDescription: string
    }[]
}
