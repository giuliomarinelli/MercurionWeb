import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { configurations } from './config/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';
import { RedisModule } from './app_modules/redis/redis.module';
import { UserModule } from './app_modules/user/user.module';
import { AuthModule } from './app_modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { GlobalGuard } from './app_modules/auth/guards/global.guard';
import { JwtToolsService } from './app_modules/auth/services/jwt-tools.service';
import { SessionService } from './app_modules/auth/services/session.service';
import { JwtService } from '@nestjs/jwt';
import { SocketIoModule } from './app_modules/socket.io/socket.io.module';
import { MercurionModule } from './app_modules/mercurion/mercurion.module';
import { ResponseService } from './services/response.service';
import { NotificationModule } from './app_modules/notification/notification.module';
import { MeilisearchModule } from './app_modules/meilisearch/meilisearch.module';
import { TestController } from './test.controller';
import { DropboxObjectStoreModule } from './app_modules/dropbox-object-store/dropbox-object-store.module';
import { OAuth2ClientModule } from './app_modules/oauth2-client/oauth2-client.module';
import { EmbeddingModule } from './app_modules/embedding/embedding.module';
import { HistoryModule } from './app_modules/history/history.module';
import { MoleculeCollectionModule } from './app_modules/molecule-collection/molecule-collection.module';
import { SynthModule } from './app_modules/synth/synth.module';
import { MercurionGraphQLModule } from './mercurion-graphql.module';





@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '../env/development.env'),
      load: [...configurations]
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get<TypeOrmModuleOptions>("Data.sqlDB") ?? {},
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
    MercurionModule,
    NotificationModule,
    MeilisearchModule,
    SocketIoModule,
    DropboxObjectStoreModule,
    OAuth2ClientModule,
    EmbeddingModule,
    HistoryModule,
    MoleculeCollectionModule,
    SynthModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GlobalGuard
    },
    JwtToolsService,
    SessionService,
    JwtService,
    ResponseService
  ],
  controllers: [TestController]
})
export class AppModule { }
