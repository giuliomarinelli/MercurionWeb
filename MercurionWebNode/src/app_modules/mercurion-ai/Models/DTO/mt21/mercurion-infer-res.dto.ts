export interface MercurionInferResDTO {
    "SR-ATAD5"?: InferenceDTO
    "NR-AhR"?: InferenceDTO
    "SR-MMP"?: InferenceDTO
    "SR-p53"?: InferenceDTO
    error?: string
}

export type MercurionInferDataDTO = Omit<MercurionInferResDTO, 'error'>

export interface InferenceDTO {
    probability: number
    is_positive: boolean
    threshold: number
}