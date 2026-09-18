import { Global, Module } from '@nestjs/common';
import { JwtToolsService } from './services/jwt-tools.service';
import { PasswordEncoderService } from './services/password-encoder.service';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from './services/session.service';
import { SecureCookieService } from './services/secure-cookie.service';
import { SecurityService } from './services/security.service';
import { AccountFlowKernel } from './application/account-flow-kernel';
import { AccountRegistrationUseCase, AccountActivationUseCase, AccountEmailAvailabilityQuery } from './application/account-registration.use-case';
import { AccountSensitiveDataUseCase } from './application/account-sensitive-data.use-case';
import { PasswordChangeUseCase, PasswordRecoveryUseCase } from './application/password-recovery.use-case';
import { AccountRecoveryUseCase } from './application/account-recovery.use-case';
import { ProfileAccountUseCase } from './application/profile-account.use-case';
import { AccountController } from './controllers/account.controller';
import { MfaApplicationService } from './services/mfa.service';
import { MfaChallengeService } from './services/mfa-challenge.service';
import { MfaEnrollmentService } from './services/mfa-enrollment.service';
import { MfaBackupCodeService } from './services/mfa-backup-code.service';
import { MfaPolicyService } from './services/mfa-policy.service';
import { MfaStrategyRegistry } from './services/mfa-strategy-registry';
import { AuthenticationController } from './controllers/authentication.controller';
import { IpService } from './services/ip.service';
import { GeoIpService } from './services/geo-ip.service';
import { TurnstileService } from './services/turnstile.service';
import { HttpModule } from '@nestjs/axios';
import { ScopeService } from './services/scope.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/models/entities/user.entity';
import { CountryService } from './services/country.service';
import { Country } from './models/entities/country.entity';
import { CountryController } from './controllers/country.controller';
import { RecoveryController } from './controllers/recovery.controller';
import { JwtKeysProvider } from './providers/jwt-keys.provider';
import { LocalDummyAuthService } from './services/local-dummy-auth.service';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/services/user.service';
import { IDENTITY_READ_PORT } from './models/interfaces/identity-read.port';
import { RedisModule } from '../redis/redis.module';
import { ResponseModule } from 'src/services/response.module';
import { GlobalGuard } from './guards/global.guard';
import { AccessTokenAuthenticationPolicy } from './guards/policies/access-token-authentication.policy';
import { AuthenticationFailurePolicy } from './guards/policies/authentication-failure.policy';
import { AuthenticationRequestContextFactory } from './guards/policies/authentication-request-context.factory';
import { AuthenticationTransportPolicy } from './guards/policies/authentication-transport.policy';
import { CredentialExtractionPolicy } from './guards/policies/credential-extraction.policy';
import { ScopeAuthorizationPolicy } from './guards/policies/scope-authorization.policy';
import { SessionValidationPolicy } from './guards/policies/session-validation.policy';
import { AuthenticationSessionService } from './application/authentication-session.service';
import {
  CredentialLoginHandler,
  VerifyEmailHandler
} from './application/credential-authentication.handlers';
import {
  CompleteMfaLoginHandler,
  StartMfaChallengeHandler
} from './application/mfa-authentication.handlers';
import {
  ListActiveSessionsHandler,
  LogoutHandler,
  RefreshWsAccessTokenHandler,
  RevokeAllSessionsHandler,
  RevokeSessionHandler
} from './application/session-authentication.handlers';
import { CompleteSsoAuthenticationHandler } from './application/sso-authentication.handler';
import { LocalDummyLoginHandler } from './application/local-dummy-login.handler';
import { SessionIdentityService } from './services/session-identity.service';
import { SessionRedisCodec } from './repositories/session-redis.codec';
import { RedisSessionRepository } from './repositories/redis-session.repository';
import { SESSION_REPOSITORY } from './models/interfaces/session-repository.interface';



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
    SessionIdentityService,
    SessionRedisCodec,
    RedisSessionRepository,
    {
      provide: SESSION_REPOSITORY,
      useExisting: RedisSessionRepository
    },
    SessionService,
    SecureCookieService,
    SecurityService,
    AccountFlowKernel,
    AccountRegistrationUseCase,
    AccountActivationUseCase,
    AccountEmailAvailabilityQuery,
    AccountSensitiveDataUseCase,
    PasswordChangeUseCase,
    PasswordRecoveryUseCase,
    AccountRecoveryUseCase,
    ProfileAccountUseCase,
    MfaApplicationService,
    MfaPolicyService,
    MfaChallengeService,
    MfaEnrollmentService,
    MfaBackupCodeService,
    MfaStrategyRegistry,
    AuthenticationSessionService,
    VerifyEmailHandler,
    CredentialLoginHandler,
    StartMfaChallengeHandler,
    CompleteMfaLoginHandler,
    LogoutHandler,
    RevokeSessionHandler,
    RevokeAllSessionsHandler,
    RefreshWsAccessTokenHandler,
    ListActiveSessionsHandler,
    CompleteSsoAuthenticationHandler,
    LocalDummyLoginHandler,
    IpService,
    GeoIpService,
    TurnstileService,
    ScopeService,
    CountryService,
    JwtKeysProvider,
    LocalDummyAuthService,
    AuthenticationRequestContextFactory,
    CredentialExtractionPolicy,
    AccessTokenAuthenticationPolicy,
    SessionValidationPolicy,
    ScopeAuthorizationPolicy,
    AuthenticationTransportPolicy,
    AuthenticationFailurePolicy,
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
    SecurityService,
    ScopeService,
    GeoIpService,
    JwtKeysProvider,
    LocalDummyAuthService,
    GlobalGuard
  ],
  controllers: [AccountController, AuthenticationController, CountryController, RecoveryController],
})
export class AuthModule { }
