import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthIdentity } from './models/entities/auth-identity.entity';
import { SocialAuthService } from './services/social-auth.service';
import { SocialAuthController } from './controllers/social-auth.controller';
import { SocialProviderRegistry } from './services/social-provider-registry';
import { GoogleProviderClient } from './providers/google-provider-client';
import { GitHubProviderClient } from './providers/github-provider-client';
import { LinkedInProviderClient } from './providers/linkedin-provider-client';
import { DiscordProviderClient } from './providers/discord-provider-client';
import { OrcidProviderClient } from './providers/orcid-provider-client';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import { ResponseModule } from 'src/services/response.module';
import { ExternalHttpModule } from 'src/infrastructure/external-http/external-http.module'
import { OAuth2ClientModule } from '../oauth2-client/oauth2-client.module'

@Global()
@Module({
    imports: [
        AuthModule,
        RedisModule,
        OAuth2ClientModule,
        ResponseModule,
        ExternalHttpModule,
        TypeOrmModule.forFeature([
            AuthIdentity
        ]),
    ],
    exports: [SocialAuthService],
    providers: [SocialAuthService, SocialProviderRegistry, GoogleProviderClient, GitHubProviderClient, LinkedInProviderClient, DiscordProviderClient, OrcidProviderClient],
    controllers: [SocialAuthController]
})
export class SSO_Module { }
