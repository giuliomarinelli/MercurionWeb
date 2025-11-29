import { AuthProvider } from "src/app_modules/sso/Models/enums/auth-provider.enum"

export interface SessionDTO {
    id : string
    createdAt: number
    expiresAt: number
    lastAccessedAt: number
    valid?: boolean
    current: boolean
    location: string
    browser: string
    provider: AuthProvider
}