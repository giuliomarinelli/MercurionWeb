import { Injectable } from "@nestjs/common";
import axios from "axios";

import { ISocialProviderClient } from "../Models/interfaces/i-social-provider-client.interface";
import { ProviderProfile } from "../Models/interfaces/provider-profile.interface";
import { AuthProvider } from "../Models/enums/auth-provider.enum";
import { ConfigService } from "@nestjs/config";
import { SSO_Configuration } from "src/config/config.types";
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class LinkedInProviderClient implements ISocialProviderClient {

    private readonly clientId: string
    private readonly clientSecret: string
    private readonly redirectUri: string

    constructor(private readonly configService: ConfigService) {
        const { clientId, clientSecret, redirectUri } = this.configService.get<SSO_Configuration>('SSO.LinkedIn')!
        this.clientId = clientId
        this.clientSecret = clientSecret
        this.redirectUri = redirectUri
    }

    getAuthorizationUrl(state: string): string {
        const params = {
            response_type: "code",
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: "openid profile email",
            state,
        }
        return `https://www.linkedin.com/oauth/v2/authorization?${new URLSearchParams(params)}`
    }

    async getProfileFromCode(code: string): Promise<ProviderProfile> {
        // 1) code -> access token
        const tokenRes = await axios.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: this.redirectUri,
                client_id: this.clientId,
                client_secret: this.clientSecret,
            }).toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )

        const accessToken = ((tokenRes as unknown as Record<string, string>).data as unknown as Record<string, string>).access_token
        if (!accessToken) {
            throw applicationError(ApplicationErrorCode.SSO_LINKEDIN_ACCESS_TOKEN_MISSING)
        }

        // 2) userinfo OIDC
        const meRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        const data = (meRes as unknown as Record<string, object>).data as Record<string, string>
        // LinkedIn userinfo di solito contiene: sub, email, email_verified, given_name, family_name, name
        return {
            provider: AuthProvider.LinkedIn,
            subject: String(data.sub),
            email: data.email ?? null,
            emailVerified: !!data.email_verified,
            firstName: data.given_name ?? data.localizedFirstName ?? "",
            lastName: data.family_name ?? data.localizedLastName ?? ""
        }
    }
}
