import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthIdentity } from './Models/entities/auth-identity.entity';
import { SocialAuthService } from './services/social-auth.service';
import { SocialAuthController } from './controllers/social-auth.controller';
import { SocialProviderRegistry } from './services/social-provider-registry';
import { GoogleProviderClient } from './providers/google-provider-client';
import { GitHubProviderClient } from './providers/github-provider-client';
import { LinkedInProviderClient } from './providers/linkedin-provider-client';
import { DiscordProviderClient } from './providers/discord-provider-client';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import { ResponseModule } from 'src/services/response.module';

@Global()
@Module({
    imports: [
        AuthModule,
        RedisModule,
        ResponseModule,
        TypeOrmModule.forFeature([
            AuthIdentity
        ]),
    ],
    exports: [SocialAuthService],
    providers: [SocialAuthService, SocialProviderRegistry, GoogleProviderClient, GitHubProviderClient, LinkedInProviderClient, DiscordProviderClient],
    controllers: [SocialAuthController]
})
export class SSO_Module { }
