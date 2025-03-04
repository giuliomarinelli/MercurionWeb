import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CookieSerializeOptions } from '@fastify/cookie'
import { SecureCookieConfiguration } from 'src/config/@types-config';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class SecureCookieService {

    private readonly logger = new Logger(SecureCookieService.name)
    private readonly secret: string
    private readonly defaultCookieOptions: CookieSerializeOptions

    constructor(private readonly configService: ConfigService) {

        const { secret, ...options } = configService.get<SecureCookieConfiguration>("SecureCookie") as SecureCookieConfiguration

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

        if (validSignature !== signature) throw new RpcException('InvalidSecureCookieSignature')
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
        console.log(options)
    }

    /**
     * Legge e valida un cookie firmato
     */
    public getSignedCookie(
        req: FastifyRequest,
        name: string
    ): string | never {
        const signedValue = req.cookies[name];
        if (!signedValue) throw new RpcException('NoSuchElementForCookieSigning')
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
