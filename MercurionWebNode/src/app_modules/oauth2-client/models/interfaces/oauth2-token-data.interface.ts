import { UUID } from "crypto"

export interface OAuth2TokenData {
    access_token: string
    expires_in: number
    new_refresh_token?: string
    refresh_token?: string
    userId?: UUID
}