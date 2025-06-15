import { Controller, Get, Query, Param, Res, Logger } from '@nestjs/common';
import { OAuth2ClientService } from '../services/oauth2-client.service';
import { FastifyReply } from 'fastify/types/reply';
import { UUID } from 'crypto';
import { Public } from 'src/metadata/metadata';



@Controller('oauth2')
export class OAuth2ClientController {

    private readonly logger = new Logger(OAuth2ClientController.name)

    constructor(
        private readonly oauth2ClientService: OAuth2ClientService
    ) { }

    @Public()
    @Get(':provider/login')
    async login(
        @Param('provider') provider: string,
        @Query('userId') userId: string,
        @Res() res: FastifyReply
    ) {
        const url = this.oauth2ClientService.getAuthorizationUrl(provider, userId)
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
        await this.oauth2ClientService.handleCallback(provider, code, state as UUID || undefined)
        return { detail: 'Login OAuth2 completato! Ora puoi chiudere questa finestra' }
    }
}
