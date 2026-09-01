export interface T1PredictionDTO {
    "SR-ATAD5"?: InferenceDTO
    "NR-AhR"?: InferenceDTO
    "SR-MMP"?: InferenceDTO
    "SR-p53"?: InferenceDTO
}

export interface T1PredictionItem {
  label: string;
  prediction: InferenceDTO;
}


export interface InferenceDTO {
    probability: number
    is_positive: boolean
    threshold: number
}
