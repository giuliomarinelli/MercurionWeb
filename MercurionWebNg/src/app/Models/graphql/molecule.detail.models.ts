import { T1PredictionDTO } from "../notebook/t1-prediction-model"
import type { GetMoleculeDetailQuery } from "../../generated/graphql"

export type MoleculeDetail = GetMoleculeDetailQuery['moleculeByMolregno'] & {
  t1Inference?: T1PredictionDTO
}

export type AdministrationRoutes = MoleculeDetail['administrationRoutes']

export type MoleculeDetailSystem = MoleculeDetail & {
  type: 'system'
}

export interface NormalizedMoleculeCollectionBasicData {
  id: string
  name: string
  canonicalSmiles: string
  type: 'system' | 'chembl' | 'custom'
}
