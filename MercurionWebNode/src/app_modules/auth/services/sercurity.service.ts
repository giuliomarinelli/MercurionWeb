import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { TotpConfiguration } from 'src/config/@types-config';
import { randomBytes } from 'crypto';
import * as speakeasy from 'speakeasy'
import { TotpWrapper } from '../Models/interfaces/totp-wrapper.interface';

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

    public generateTotpSecret(): string {
        return this.generateSecret(this.totpConf.bytes, 'base32')
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


}
