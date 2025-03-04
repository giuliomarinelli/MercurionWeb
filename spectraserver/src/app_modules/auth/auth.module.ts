import { Module } from '@nestjs/common';
import { RevokedTokenService } from './services/revoked-token.service';
import { JwtToolsService } from './services/jwt-tools.service';
import { PasswordEncoderService } from './services/password-encoder.service';
import { RedisModule } from '../redis/redis.module';
import { JwtService } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { RedisService } from '../redis/services/redis.service';
import { SessionService } from './services/session.service';


@Module({
  imports: [RedisModule, UserModule],
  providers: [RevokedTokenService, JwtToolsService, PasswordEncoderService, JwtService, RedisService, SessionService]
})
export class AuthModule {}
