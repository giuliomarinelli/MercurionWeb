import { TokenPair } from "src/app_modules/auth/Models/interfaces/token-pair.interface";

export interface SSO_AuthData extends TokenPair {
    sessionId: string
}