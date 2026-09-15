import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISocialProviderClient } from '../models/interfaces/i-social-provider-client.interface';
import { ProviderProfile } from '../models/interfaces/provider-profile.interface';
import { AuthProvider } from '../models/enums/auth-provider.enum';
import { SSO_Configuration } from 'src/config/config.types';
import { GitHubEmailResponse, GitHubTokenResponse, GitHubUserResponse } from '../models/interfaces/github-response.interfaces';
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { errorMessage } from 'src/utils/errors/error-message'
import { ExternalHttpPort } from 'src/infrastructure/external-http/external-http.port'


@Injectable()
export class GitHubProviderClient implements ISocialProviderClient {

    private readonly clientId: string
    private readonly clientSecret: string
    private readonly redirectUri: string

    private readonly authEndpoint = 'https://github.com/login/oauth/authorize'
    private readonly tokenEndpoint = 'https://github.com/login/oauth/access_token'
    private readonly apiBase = 'https://api.github.com'

    constructor(
        private readonly configService: ConfigService,
        private readonly http: ExternalHttpPort,
    ) {
        const { clientId, clientSecret, redirectUri } = this.configService.get<SSO_Configuration>('SSO.GitHub')!
        this.clientId = clientId
        this.clientSecret = clientSecret
        this.redirectUri = redirectUri
    }

    getAuthorizationUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: 'read:user user:email',
            state,
            allow_signup: 'true'
        })

        return `${this.authEndpoint}?${params.toString()}`
    }

    async getProfileFromCode(code: string): Promise<ProviderProfile> {
        try {
            // 1) code -> access token
            const tokenRes = await this.http.post<GitHubTokenResponse>(
                this.tokenEndpoint,
                {
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code,
                    redirect_uri: this.redirectUri,
                },
                {
                    timeoutMs: 10_000,
                    headers: { Accept: 'application/json' },
                },
            )

            const accessToken = tokenRes.data.access_token;
            if (!accessToken) {
                throw applicationError(ApplicationErrorCode.SSO_GITHUB_ACCESS_TOKEN_MISSING)
            }

            // 2) /user
            const userRes = await this.http.get<GitHubUserResponse>(`${this.apiBase}/user`, {
                timeoutMs: 10_000,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github+json'
                }
            })

            // 3) /user/emails
            const emailsRes = await this.http.get<GitHubEmailResponse[]>(`${this.apiBase}/user/emails`, {
                timeoutMs: 10_000,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github+json'
                }
            })

            const emails = emailsRes.data ?? []
            const primary = emails.find(e => e.primary) ?? emails[0]

            const email = primary?.email ?? null
            const emailVerified = !!primary?.verified

            // name spesso null su GitHub
            const fullName = userRes.data.name?.trim() ?? ''
            const [firstName = '', ...rest] = fullName.split(/\s+/)
            const lastName = rest.join(' ')

            return {
                provider: AuthProvider.GitHub,
                subject: String(userRes.data.id),     // stabile: numeric id GitHub
                email,
                emailVerified,
                firstName,
                lastName,
            };
        } catch (e) {
            const detail = errorMessage(e)

            throw applicationError(ApplicationErrorCode.SSO_GITHUB_PROFILE_FETCH_FAILED, `GitHub: failed to fetch profile (${detail})`)
        }
    }
}
