import { TokenPair } from "src/app_modules/auth/models/interfaces/token-pair.interface";
import { ConfirmDTO } from "src/models/confirm-responses.dto";
import { AuthProvider } from "../enums/auth-provider.enum";

export interface SSO_LoginDTO extends TokenPair, ConfirmDTO {
    sso_flow: true
    sso_provider: AuthProvider 
    needs_browser_info: true
}