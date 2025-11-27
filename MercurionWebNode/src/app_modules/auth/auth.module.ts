import { Module, forwardRef } from '@nestjs/common';
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
import { AuthenticationService } from './services/authentication.service';
import { AuthenticationController } from './controllers/authentication.controller';
import { IpService } from './services/ip.service';
import { GeoIpService } from './services/geo-ip.service';
import { TurnstileService } from './services/turnstile.service';
import { HttpModule } from '@nestjs/axios';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { ScopeService } from './services/scope.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/Models/entities/user.entity';
import { CountryService } from './services/country.service';
import { Country } from './Models/entities/country.entity';
import { CountryController } from './controllers/country.controller';
import { RecoveryController } from './controllers/recovery.controller';



@Module({
  imports: [
    forwardRef(() => RedisModule),
    forwardRef(() => UserModule),
    NotificationModule,
    HttpModule,
    forwardRef(() => MeilisearchModule),
    TypeOrmModule.forFeature([User, Country])
  ],
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
    MfaService,
    AuthenticationService,
    IpService,
    GeoIpService,
    TurnstileService,
    ScopeService,
    CountryService
  ],
  exports: [
    SecureCookieService,
    JwtToolsService,
    JwtService,
    SessionService,
    PasswordEncoderService,
    SercurityService,
    ScopeService
  ],
  controllers: [AccountController, AuthenticationController, CountryController, RecoveryController],
})
export class AuthModule { }
