import { Module } from '@nestjs/common';
import { JwtToolsService } from './services/jwt-tools.service';
import { PasswordEncoderService } from './services/password-encoder.service';
import { RedisModule } from '../redis/redis.module';
import { JwtService } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { RedisService } from '../redis/services/redis.service';
import { SessionService } from './services/session.service';
import { SecureCookieService } from './services/secure-cookie.service';
import { SercurityService } from './services/sercurity.service';


@Module({
  imports: [RedisModule, UserModule],
  providers: [
    JwtToolsService,
    PasswordEncoderService,
    JwtService,
    RedisService,
    SessionService,
    SecureCookieService,
    SercurityService
  ],
  exports: [SecureCookieService, JwtToolsService, JwtService, SessionService],
})
export class AuthModule { }
