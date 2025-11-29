import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthIdentity } from './Models/entities/auth-identity.entity';
import { UserModule } from '../user/user.module';
import { SocialAuthService } from './services/social-auth.service';
import { SocialAuthController } from './providers/social-auth.controller';
import { SocialProviderRegistry } from './services/social-provider-registry';
import { GoogleProviderClient } from './providers/google-provider-client';
import { AuthModule } from '../auth/auth.module';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { ResponseService } from 'src/services/response.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([AuthIdentity]),
        forwardRef(() => UserModule),
        AuthModule,
        forwardRef(() => MeilisearchModule)
    ],
    exports: [TypeOrmModule],
    providers: [SocialAuthService, SocialProviderRegistry, GoogleProviderClient, ResponseService],
    controllers: [SocialAuthController]
})
export class SSO_Module { }
