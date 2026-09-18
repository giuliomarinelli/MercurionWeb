import type { Tox21Inference, Tox21Prediction } from '@mercurion/rest-contracts'

export interface MercurionInferResDTO extends Tox21Prediction {
    error?: string
}

export type MercurionInferDataDTO = Tox21Prediction
export type InferenceDTO = Tox21Inference