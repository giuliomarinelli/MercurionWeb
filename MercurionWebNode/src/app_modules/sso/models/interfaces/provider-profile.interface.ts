import { AuthProvider } from "../enums/auth-provider.enum";

export interface ProviderProfile {
  provider: AuthProvider
  subject: string          // sub OIDC o id Facebook
  email: string | null
  emailVerified: boolean
  firstName?: string
  lastName?: string
  avatarUrl?: string
}
