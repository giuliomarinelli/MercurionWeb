import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RevokedTokenService } from './revoked-token.service';

@Injectable()
export class JwtToolsService {

    constructor(
        private readonly jwtService: JwtService,
        private readonly revokedTokenService: RevokedTokenService
    ) { }

}
