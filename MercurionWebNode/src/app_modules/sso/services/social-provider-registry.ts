import { Injectable } from "@nestjs/common";
import { AuthProvider } from "../Models/enums/auth-provider.enum";
import { ISocialProviderClient } from "../Models/interfaces/i-social-provider-client.interface";
import { GoogleProviderClient } from "../providers/google-provider-client";

import { GitHubProviderClient } from "../providers/github-provider-client";
import { LinkedInProviderClient } from "../providers/linkedin-provider-client";
import { DiscordProviderClient } from "../providers/discord-provider-client";
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class SocialProviderRegistry {

    private readonly map: Record<AuthProvider, ISocialProviderClient | null>

    constructor(
        google: GoogleProviderClient,
        github: GitHubProviderClient,
        linkedIn: LinkedInProviderClient,       
        discord: DiscordProviderClient,
    ) {
        this.map = {
            [AuthProvider.Google]: google,
            [AuthProvider.GitHub]: null,                   
            [AuthProvider.LinkedIn]: null,
            [AuthProvider.Discord]: discord,
            [AuthProvider.Mercurion]: null
        }
    }

    get(provider: AuthProvider): ISocialProviderClient {
        const c = this.map[provider]
        if (!c) {
            throw applicationError(ApplicationErrorCode.SSO_PROVIDER_UNSUPPORTED, `SSO_BadRequest::Provider not supported: ${provider}`)
        }
        return c
    }
}
