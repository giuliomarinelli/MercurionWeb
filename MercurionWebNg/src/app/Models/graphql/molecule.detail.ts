import { T1PredictionDTO } from "../notebook/t1-prediction-model"
import { MoleculeProperties } from "./molecule-properties.interface"


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
    t1Inference?: T1PredictionDTO
}
