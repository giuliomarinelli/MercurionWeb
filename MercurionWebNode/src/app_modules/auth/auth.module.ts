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
import { AccountService } from './services/account.service';
import { ResponseService } from 'src/services/response.service';
import { NotificationModule } from '../notification/notification.module';
import { AccountController } from './controllers/account.controller';
import { MfaService } from './services/mfa.service';



@Module({
  imports: [RedisModule, UserModule, NotificationModule],
  providers: [
    JwtToolsService,
    PasswordEncoderService,
    JwtService,
    RedisService,
    SessionService,
    SecureCookieService,
    SercurityService,
    AccountService,
    ResponseService,
    MfaService
  ],
  exports: [SecureCookieService, JwtToolsService, JwtService, SessionService],
  controllers: [AccountController],
})
export class AuthModule { }
