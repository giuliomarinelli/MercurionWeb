import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';
import { RedisModule } from './app_modules/redis/redis.module';
import { UserModule } from './app_modules/user/user.module';
import { AuthModule } from './app_modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { GlobalGuard } from './app_modules/auth/guards/global.guard';
import { SocketIoModule } from './app_modules/socket.io/socket.io.module';
import { NotificationModule } from './app_modules/notification/notification.module';
import { MeilisearchModule } from './app_modules/meilisearch/meilisearch.module';
import { DropboxObjectStoreModule } from './app_modules/dropbox-object-store/dropbox-object-store.module';
import { OAuth2ClientModule } from './app_modules/oauth2-client/oauth2-client.module';
import { EmbeddingModule } from './app_modules/embedding/embedding.module';
import { HistoryModule } from './app_modules/history/history.module';
import { MoleculeCollectionModule } from './app_modules/molecule-collection/molecule-collection.module';
import { SynthModule } from './app_modules/synth/synth.module';
import { MercurionGraphQLModule } from './mercurion-graphql.module';
import { MercurionAIModule } from './app_modules/mercurion-ai/mercurion-ai.module';
import { LabNotebookModule } from './app_modules/lab-notebook/lab-notebook.module';
import { AdminModule } from './app_modules/admin/admin.module';
import { SSO_Module } from './app_modules/sso/sso.module';
import { HelpModule } from './app_modules/help/help.module';
import { FeedbackModule } from './app_modules/feedback/feedback.module';
import { ReleaseVersionModule } from './app_modules/release-version/release-version.module';
import { HealthController } from './health.controller';
import { AssetController } from './asset.controller';
import { ReadinessService } from './shutdown/readiness.service'
import {
  createConfigurationModule,
  type ConfigurationModuleOptions
} from './config/configuration.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get<TypeOrmModuleOptions>("Data.pgSQL") ?? {},
      inject: [ConfigService]
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => configService.get<MailerOptions>("Email") ?? {},
      inject: [ConfigService]
    }),
    MercurionGraphQLModule,
    RedisModule,
    UserModule,
    AuthModule,
    SocketIoModule,
    MercurionAIModule,
    NotificationModule,
    MeilisearchModule,
    DropboxObjectStoreModule,
    OAuth2ClientModule,
    EmbeddingModule,
    HistoryModule,
    MoleculeCollectionModule,
    SynthModule,
    LabNotebookModule,
    AdminModule,
    SSO_Module,
    HelpModule,
    FeedbackModule,
    ReleaseVersionModule
  ],
  providers: [
    ReadinessService,
    {
      provide: APP_GUARD,
      useExisting: GlobalGuard
    }
  ],
  controllers: [HealthController, AssetController]
})
export class AppModule { }

@Module({})
class ApplicationBootstrapModule {}

export interface ApplicationModuleOptions {
  readonly configuration?: ConfigurationModuleOptions
}

export function createApplicationModule(
  options: ApplicationModuleOptions = {}
): DynamicModule {
  return {
    module: ApplicationBootstrapModule,
    imports: [
      createConfigurationModule(options.configuration),
      AppModule
    ]
  }
}
