import { Controller, Get, Query, Param, Res } from '@nestjs/common';
import { OAuth2ClientService } from '../services/oauth2-client.service';
import { FastifyReply } from 'fastify/types/reply';
import { UUID } from 'crypto';
import { Public } from 'src/metadata/metadata';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';




@Controller('oauth2')
export class OAuth2ClientController {

    private readonly logger: LoggerContext

    constructor(
        private readonly oauth2ClientService: OAuth2ClientService,
        meiliLogger: LoggerPort
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
        // state/userId may be provider-specific or opaque; intentionally no UUID validation here
        const normalizedUserId = typeof userId === 'string' ? userId.trim() : userId
        const url = this.oauth2ClientService.getAuthorizationUrl(provider, normalizedUserId)
        this.logger.log(`Redirect to: ${url}`)
        res.raw.writeHead(302, { Location: url })
        res.raw.end()
    }

    @Public()
    @Get(':provider/callback')
    async callback(
        @Param('provider') provider: string,
        @Query('code') code: string,
        @Query('state') state: string // spesso usato come userId o anti-CSRF
    ) {
        // state can be an opaque provider token; no UUID validation by design
        const normalizedState = typeof state === 'string' ? state.trim() : state
        await this.oauth2ClientService.handleCallback(provider, code, normalizedState as UUID || undefined)
        return { detail: 'Login OAuth2 completato! Ora puoi chiudere questa finestra' }
    }
}
