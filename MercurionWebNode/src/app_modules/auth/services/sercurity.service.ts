import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { TotpConfiguration } from 'src/config/@types-config';
import { randomBytes } from 'crypto';
import * as speakeasy from 'speakeasy'
import { TotpWrapper } from '../Models/interfaces/totp-wrapper.interface';
import { AppTotpWrapper } from '../Models/interfaces/app-totp-wrapper.interface';
import * as qrcode from 'qrcode';

@Injectable()
export class SercurityService {

    private readonly totpConf: TotpConfiguration

    constructor(private readonly configService: ConfigService) {
        this.totpConf = this.configService.get<TotpConfiguration>('Totp') as TotpConfiguration
    }

    public generateSecret(bytes: number, encode: 'hex' | 'base32' | 'base64'): string {

        const buffer: Buffer = randomBytes(bytes)
        const hexPrefix: string = "0x"
        switch (encode) {
            case 'base32':
                return speakeasy.generateSecret({ length: bytes }).base32

            case 'base64':
                return buffer.toString(encode)

            case 'hex':
                return hexPrefix + buffer.toString(encode)
        }
    }



    public async generateQrCodeDataUrl(otpauth_url: string): Promise<string> {
        return await qrcode.toDataURL(otpauth_url)
    }


    public generateOtpSecret(): string {
        return this.generateSecret(this.totpConf.bytes, 'base32')
    }

    public generateAppTotpSecret(): AppTotpWrapper {
        const secret = speakeasy.generateSecret({
            name: this.configService.get<string>('App.globalName'),
            length: this.totpConf.bytes,
            issuer: this.configService.get<string>('App.globalName')
        })
        return {
            totpSecret: secret.base32,
            otpauth_url: secret.otpauth_url as string
        }
    }

    public generateTotp(base32Secret: string): TotpWrapper {

        const TOTP = speakeasy.totp({
            secret: base32Secret,
            encoding: 'base32',
            digits: this.totpConf.digits,
            step: this.totpConf.period,
            algorithm: "sha256"
        })

        const now = new Date()
        now.setMilliseconds(0)
        const generatedAt: number = now.getTime()
        const expiresAt: number = generatedAt + this.totpConf.period * 1000

        return {
            TOTP,
            generatedAt,
            expiresAt
        }
    }

    public verifyTotp(totp: string, base32Secret: string): boolean {

        return speakeasy.totp.verify({
            secret: base32Secret,
            encoding: 'base32',
            token: totp,
            digits: this.totpConf.digits,
            step: this.totpConf.period,
            algorithm: 'sha256',
            window: 1
        })
    }

    public maskEmail(email: string): string {
        const [localPart, domain] = email.split('@')
        if (!domain) return '*'.repeat(localPart.length) + '@'

        const domainParts = domain.split('.')
        const extension = domainParts.pop() || ''
        const domainWithoutExt = domainParts.join('.')
        const visibleDomain = domainWithoutExt.slice(-2)
        const maskedLocal = '*'.repeat(localPart.length)
        const maskedDomain = '*'.repeat(domainWithoutExt.length - 2)

        return `${maskedLocal}@${maskedDomain}${visibleDomain}.${extension}`
    }

    public maskPhone(phone: string): string {
        const visible = phone.slice(-2);
        const masked = '*'.repeat(Math.max(0, phone.length - 2));
        return masked + visible;
    }

}
