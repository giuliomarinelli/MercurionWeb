import { Module } from '@nestjs/common';
import { RevokedTokenService } from './services/revoked-token.service';
import { JwtToolsService } from './services/jwt-tools.service';


@Module({
  providers: [RevokedTokenService, JwtToolsService]
})
export class AuthModule {}
