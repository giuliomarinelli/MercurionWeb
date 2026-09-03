import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CookieSerializeOptions } from '@fastify/cookie'
import { SecureCookieConfiguration } from 'src/config/config.types';

import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class SecureCookieService {

    private readonly logger: MeiliContextLogger
    private readonly secret: string
    private readonly defaultCookieOptions: CookieSerializeOptions

    constructor(
        private readonly configService: ConfigService,
        meiliLogger: MeiliLoggerService
    ) {
        this.logger = meiliLogger.forContext(SecureCookieService.name)

        const { secret, ...options } = configService.get<SecureCookieConfiguration>("SecureCookie")!

        this.secret = secret
        this.defaultCookieOptions = options

    }

    /**
     * Firma il valore del cookie e restituisce un valore esadecimale
     */
    public signCookie(value: string): string {
        const signature = createHmac('sha256', this.secret)
            .update(value)
            .digest('hex');
        return `${value}.${signature}`;
    }

    /**
     * Verifica la firma del cookie e restituisce il valore originale se valido
     */
    public verifyAndParseCookie(signedValue: string): string | never {
        
        const [value, signature] = signedValue.split('.')
        const validSignature = createHmac('sha256', this.secret)
            .update(value)
            .digest('hex')

        if (validSignature !== signature) throw applicationError(ApplicationErrorCode.SECURE_COOKIE_SIGNATURE_INVALID)
        return value

    }

    /**
     * Imposta un cookie firmato
     */
    public setSignedCookie(
        res: FastifyReply,
        name: string,
        value: string,
        options: CookieSerializeOptions = this.defaultCookieOptions) {
        const signedValue = this.signCookie(value)
        res.setCookie(name, signedValue, options)
    }

    /**
     * Legge e valida un cookie firmato
     */
    public getSignedCookie(
        req: FastifyRequest,
        name: string
    ): string | never {
        const signedValue = req.cookies[name];
        if (!signedValue) throw applicationError(ApplicationErrorCode.SECURE_COOKIE_VALUE_MISSING)
        return this.verifyAndParseCookie(signedValue)
    }

    public clearCookie(
        res: FastifyReply,
        name: string,
        options: CookieSerializeOptions = this.defaultCookieOptions
    ) {
        res.clearCookie(name, {
            ...options,
            expires: new Date(0) // Imposta la scadenza al passato per eliminare il cookie
        });
    }



}
