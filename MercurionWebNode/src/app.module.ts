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
import { ChemblModule } from './app_modules/chembl/chembl.module';
import { MeilisearchModule } from './app_modules/meilisearch/meilisearch.module';
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TestController } from './test.controller';


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
    TypeOrmModule.forRootAsync({
      name: 'ChemblDB',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => configService.get<TypeOrmModuleOptions>("Data.chemblDB") ?? {},
      inject: [ConfigService]
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => configService.get<MailerOptions>("Email") ?? {},
      inject: [ConfigService]
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src', 'schema.graphql'),
      playground: true,
      installSubscriptionHandlers: false,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      context: ({ request, reply }) => ({ req: request, reply })
    }),
    RedisModule,
    UserModule,
    AuthModule,
    SocketIoModule,
    MercurionModule,
    NotificationModule,
    ChemblModule,
    MeilisearchModule,
    SocketIoModule
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
