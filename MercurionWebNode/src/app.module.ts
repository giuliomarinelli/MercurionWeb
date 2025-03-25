import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { configurations } from './config/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';
import { RedisModule } from './app_modules/redis/redis.module';
import { UserModule } from './app_modules/user/user.module';
import { CopyToDistService } from './copy-to-dist/copy-to-dist.service';
import { AuthModule } from './app_modules/auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalInterceptor } from './app_modules/auth/interceptors/global.interceptor';
import { GlobalGuard } from './app_modules/auth/guards/global.guard';
import { JwtToolsService } from './app_modules/auth/services/jwt-tools.service';
import { SessionService } from './app_modules/auth/services/session.service';
import { JwtService } from '@nestjs/jwt';
import { SocketIoModule } from './app_modules/socket.io/socket.io.module';
import { MercurionModule } from './app_modules/mercurion/mercurion.module';
import { ResponseService } from './services/response.service';
import { NotificationModule } from './app_modules/notification/notification.module';


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
    RedisModule,
    UserModule,
    AuthModule,
    SocketIoModule,
    MercurionModule,
    NotificationModule
  ],
  providers: [
    CopyToDistService,
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalInterceptor
    },
    {
      provide: APP_GUARD,
      useClass: GlobalGuard
    },
    JwtToolsService,
    SessionService,
    JwtService,
    ResponseService
  ]
})
export class AppModule { }
