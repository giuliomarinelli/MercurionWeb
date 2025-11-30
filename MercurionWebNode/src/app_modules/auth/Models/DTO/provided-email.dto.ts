import { AuthProvider } from "src/app_modules/sso/Models/enums/auth-provider.enum"

export interface ProvidedEmailDTO {
    email: string
    provider: AuthProvider
}