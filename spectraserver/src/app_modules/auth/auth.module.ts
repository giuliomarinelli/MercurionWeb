import { Module } from '@nestjs/common';
import { RevokedTokenService } from './services/revoked-token.service';
import { JwtToolsService } from './services/jwt-tools.service';
import { PasswordEncoderService } from './services/password-encoder.service';


@Module({
  providers: [RevokedTokenService, JwtToolsService, PasswordEncoderService]
})
export class AuthModule {}
