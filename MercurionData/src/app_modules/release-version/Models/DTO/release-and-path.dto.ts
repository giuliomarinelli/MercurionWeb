export interface ReleaseAndPathDTO {
    version: string
    envPath: string
}

export interface ReleaseResponseDTO {
    version?: string
    envPath?: string
    ok: boolean
    detail?: string
}