import { UUID } from "crypto"

export interface Authentication {
    userId: UUID
    sessionId: UUID
}