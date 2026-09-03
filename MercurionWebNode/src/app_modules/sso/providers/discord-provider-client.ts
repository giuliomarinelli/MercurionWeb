import { Injectable } from "@nestjs/common";
import axios from "axios";

import { ISocialProviderClient } from "../Models/interfaces/i-social-provider-client.interface";
import { ProviderProfile } from "../Models/interfaces/provider-profile.interface";
import { AuthProvider } from "../Models/enums/auth-provider.enum";
import { ConfigService } from "@nestjs/config";
import { SSO_Configuration } from "src/config/config.types";
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class DiscordProviderClient implements ISocialProviderClient {

    private readonly clientId: string
    private readonly clientSecret: string
    private readonly redirectUri: string

    constructor(private readonly configService: ConfigService) {
        const { clientId, clientSecret, redirectUri } = this.configService.get<SSO_Configuration>('SSO.Discord')!
        this.clientId = clientId
        this.clientSecret = clientSecret
        this.redirectUri = redirectUri
    }

    getAuthorizationUrl(state: string): string {
        const params = {
            response_type: "code",
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: "identify email",
            state,
            prompt: "consent",
        };
        return `https://discord.com/oauth2/authorize?${new URLSearchParams(params)}`
    }

    async getProfileFromCode(code: string): Promise<ProviderProfile> {
        // 1) code -> access token
        const tokenRes = await axios.post(
            "https://discord.com/api/oauth2/token",
            new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: this.redirectUri,
                client_id: this.clientId,
                client_secret: this.clientSecret,
            }).toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )

        const accessToken = (tokenRes.data as Record<string, string>).access_token
        if (!accessToken) {
            throw applicationError(ApplicationErrorCode.SSO_DISCORD_ACCESS_TOKEN_MISSING)
        }

        // 2) /users/@me
        const meRes = await axios.get("https://discord.com/api/users/@me", {
            headers: { Authorization: `Bearer ${accessToken}` }
        })

        const u = meRes.data as Record<string, string>
    
        const fullName = (u.global_name || u.username || "").trim()
        const [firstName, ...rest] = fullName.split(" ")
        const lastName = rest.join(" ")

        return {
            provider: AuthProvider.Discord,
            subject: String(u.id),
            email: u.email ?? null,
            emailVerified: !!u.verified,
            firstName: firstName ?? "",
            lastName: lastName ?? ""
        }
    }
}
