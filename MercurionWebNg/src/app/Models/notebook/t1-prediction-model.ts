import type { Tox21Inference } from '@mercurion/rest-contracts'

export interface T1PredictionItem {
  label: string;
  prediction: Tox21Inference;
}

export type {
  Tox21Inference as InferenceDTO,
  Tox21Prediction as T1PredictionDTO
} from '@mercurion/rest-contracts'
