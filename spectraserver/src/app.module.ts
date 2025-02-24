import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { configurations } from './config/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MailerModule, MailerOptions } from '@nestjs-modules/mailer';
import { RedisModule } from './app_modules/redis/redis.module';


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
  RedisModule
]
})
export class AppModule {}
