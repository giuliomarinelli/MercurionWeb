import { Controller, Get, Query, Param, Res, UnauthorizedException } from '@nestjs/common';
import { OAuth2ClientService } from '../services/oauth2-client.service';
import { FastifyReply } from 'fastify/types/reply';
import { UUID } from 'crypto';
import { Public } from 'src/metadata/metadata';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';
import { OAuthStateService } from '../services/oauth-state.service';




@Controller('oauth2')
export class OAuth2ClientController {

    private readonly logger: LoggerContext

    constructor(
        private readonly oauth2ClientService: OAuth2ClientService,
        meiliLogger: LoggerPort,
        private readonly oauthStateService: OAuthStateService,
    ) {
        this.logger = meiliLogger.forContext(OAuth2ClientController.name)
    }

    @Public()
    @Get(':provider/login')
    async login(
        @Param('provider') provider: string,
        @Query('userId') userId: string,
        @Res() res: FastifyReply
    ) {
        const normalizedUserId = typeof userId === 'string' ? userId.trim() : userId
        const url = await this.oauth2ClientService.getAuthorizationUrl(provider, normalizedUserId)
        this.logger.log(`Redirect to OAuth provider: ${provider}`)
        res.raw.writeHead(302, { Location: url })
        res.raw.end()
    }

    @Public()
    @Get(':provider/callback')
    async callback(
        @Param('provider') provider: string,
        @Query('code') code: string,
        @Query('state') state: string
    ) {
        const normalizedState = typeof state === 'string' ? state.trim() : state
        const stateRecord = await this.oauthStateService.consume(
            normalizedState,
            provider,
            'oauth2-connect',
        )
        if (!stateRecord) {
            throw new UnauthorizedException('Invalid or expired OAuth state')
        }
        await this.oauth2ClientService.handleCallback(
            provider,
            code,
            stateRecord.ownerUserId as UUID | undefined,
        )
        return { detail: 'Login OAuth2 completato! Ora puoi chiudere questa finestra' }
    }
}
