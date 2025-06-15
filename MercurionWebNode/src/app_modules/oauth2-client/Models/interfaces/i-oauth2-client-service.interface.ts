export interface IOAuth2ClientService {
    getAccessToken(provider: string, userId?: string): Promise<string>
    getAuthorizationUrl(provider: string, userId?: string): string
    handleCallback(provider: string, code: string, userId?: string): Promise<void>
    refreshAccessToken(provider: string, userId?: string): Promise<string>
}
