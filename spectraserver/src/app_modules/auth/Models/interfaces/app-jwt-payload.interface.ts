import { UUID } from "crypto"
import { TokenType } from "../enums/token-type.enum"



export interface AppJwtPayload {

    iss: string
    sub: UUID
    jti: UUID
    sid: UUID
    typ: TokenType
    iat: number
    exp: number
    scp: string

    
}