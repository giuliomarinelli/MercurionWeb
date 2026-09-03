import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';


import { ISocialProviderClient } from '../Models/interfaces/i-social-provider-client.interface';
import { ProviderProfile } from '../Models/interfaces/provider-profile.interface';
import { AuthProvider } from '../Models/enums/auth-provider.enum';
import { SSO_Configuration } from 'src/config/config.types';
import { GitHubEmailResponse, GitHubTokenResponse, GitHubUserResponse } from '../Models/interfaces/github-response.interfaces';
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'


@Injectable()
export class GitHubProviderClient implements ISocialProviderClient {

    private readonly clientId: string
    private readonly clientSecret: string
    private readonly redirectUri: string

    private readonly authEndpoint = 'https://github.com/login/oauth/authorize'
    private readonly tokenEndpoint = 'https://github.com/login/oauth/access_token'
    private readonly apiBase = 'https://api.github.com'

    constructor(private readonly configService: ConfigService) {
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
            const tokenRes = await axios.post<GitHubTokenResponse>(
                this.tokenEndpoint,
                {
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code,
                    redirect_uri: this.redirectUri,
                },
                {
                    headers: { Accept: 'application/json' },
                },
            )

            const accessToken = tokenRes.data.access_token;
            if (!accessToken) {
                throw applicationError(ApplicationErrorCode.SSO_GITHUB_ACCESS_TOKEN_MISSING)
            }

            // 2) /user
            const userRes = await axios.get<GitHubUserResponse>(`${this.apiBase}/user`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github+json'
                }
            })

            // 3) /user/emails
            const emailsRes = await axios.get<GitHubEmailResponse[]>(`${this.apiBase}/user/emails`, {
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const detail =
                ((e)?.response?.data?.error_description as unknown as string) ||
                e?.response?.data?.error ||
                e?.message ||
                'unknown error'

            throw applicationError(ApplicationErrorCode.SSO_GITHUB_PROFILE_FETCH_FAILED, `GitHub: failed to fetch profile (${detail})`)
        }
    }
}
