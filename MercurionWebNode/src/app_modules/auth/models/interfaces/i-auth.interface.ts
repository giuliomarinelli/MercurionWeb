import { UUID } from "crypto";

export interface IAuth {
    userId: UUID
    passwordHash: string
    locked: boolean
}