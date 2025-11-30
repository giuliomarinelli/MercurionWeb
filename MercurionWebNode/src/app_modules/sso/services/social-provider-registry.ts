import { Injectable } from "@nestjs/common";
import { AuthProvider } from "../Models/enums/auth-provider.enum";
import { ISocialProviderClient } from "../Models/interfaces/i-social-provider-client.interface";
import { GoogleProviderClient } from "../providers/google-provider-client";
import { RpcException } from "@nestjs/microservices";
import { GitHubProviderClient } from "../providers/github-provider-client";

@Injectable()
export class SocialProviderRegistry {

    private readonly map: Record<AuthProvider, ISocialProviderClient | null>

    constructor(
        google: GoogleProviderClient,
        github: GitHubProviderClient,
        // apple: AppleProviderClient,
        // facebook: FacebookProviderClient,
    ) {
        this.map = {
            [AuthProvider.Google]: google,
            [AuthProvider.GitHub]: github,
            [AuthProvider.Apple]: null,
            [AuthProvider.Facebook]: null,
            [AuthProvider.Mercurion]: null // non usato qui
        }
    }

    get(provider: AuthProvider): ISocialProviderClient {
        const c = this.map[provider]
        if (!c) {
            throw new RpcException(`Provider not supported: ${provider}`)
        }
        return c
    }
}
