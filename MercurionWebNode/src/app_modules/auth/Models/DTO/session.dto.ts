export interface SessionDTO {
    id : string
    createdAt: number
    expiresAt: number
    lastAccessedAt: number
    valid?: boolean
    current: boolean
    location: string
    browser: string
}