import { Module } from '@nestjs/common';
import { RevokedTokenService } from './services/revoked-token.service';


@Module({
  providers: [RevokedTokenService]
})
export class AuthModule {}
