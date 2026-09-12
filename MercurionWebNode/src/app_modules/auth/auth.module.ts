import { Global, Module } from '@nestjs/common';
import { JwtToolsService } from './services/jwt-tools.service';
import { PasswordEncoderService } from './services/password-encoder.service';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from './services/session.service';
import { SecureCookieService } from './services/secure-cookie.service';
import { SercurityService } from './services/sercurity.service';
import { AccountService } from './services/account.service';
import { AccountController } from './controllers/account.controller';
import { MfaService } from './services/mfa.service';
import { AuthenticationService } from './services/authentication.service';
import { AuthenticationController } from './controllers/authentication.controller';
import { IpService } from './services/ip.service';
import { GeoIpService } from './services/geo-ip.service';
import { TurnstileService } from './services/turnstile.service';
import { HttpModule } from '@nestjs/axios';
import { ScopeService } from './services/scope.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/Models/entities/user.entity';
import { CountryService } from './services/country.service';
import { Country } from './Models/entities/country.entity';
import { CountryController } from './controllers/country.controller';
import { RecoveryController } from './controllers/recovery.controller';
import { JwtKeysProvider } from './providers/jwt-keys.provider';
import { LocalDummyAuthService } from './services/local-dummy-auth.service';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/services/user.service';
import { IDENTITY_READ_PORT } from './Models/interfaces/identity-read.port';
import { RedisModule } from '../redis/redis.module';
import { ResponseModule } from 'src/services/response.module';
import { GlobalGuard } from './guards/global.guard';



@Global()
@Module({
  imports: [
    HttpModule,
    UserModule,
    RedisModule,
    ResponseModule,
    TypeOrmModule.forFeature([User, Country])
  ],
  providers: [
    JwtToolsService,
    PasswordEncoderService,
    JwtService,
    SessionService,
    SecureCookieService,
    SercurityService,
    AccountService,
    MfaService,
    AuthenticationService,
    IpService,
    GeoIpService,
    TurnstileService,
    ScopeService,
    CountryService,
    JwtKeysProvider,
    LocalDummyAuthService,
    GlobalGuard,
    {
      provide: IDENTITY_READ_PORT,
      useExisting: UserService
    }
  ],
  exports: [
    SecureCookieService,
    JwtToolsService,
    SessionService,
    PasswordEncoderService,
    SercurityService,
    ScopeService,
    GeoIpService,
    JwtKeysProvider,
    LocalDummyAuthService,
    GlobalGuard
  ],
  controllers: [AccountController, AuthenticationController, CountryController, RecoveryController],
})
export class AuthModule { }
