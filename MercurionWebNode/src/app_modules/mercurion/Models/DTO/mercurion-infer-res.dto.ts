export interface MercurionInferResDTO {
    "SR-ATAD5"?: number
    "NR-AhR"?: number
    "SR-MMP"?: number
    "SR-p53"?: number
    error?: string
}

export type MercurionInferDataDTO = Omit<MercurionInferResDTO, 'error'>