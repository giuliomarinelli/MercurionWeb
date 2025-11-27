import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { TotpConfiguration } from 'src/config/config.types';
import { createCipheriv, createDecipheriv, createHmac, randomBytes, UUID } from 'crypto';
import * as speakeasy from 'speakeasy'
import { TotpWrapper } from '../Models/interfaces/totp-wrapper.interface';
import { AppTotpWrapper } from '../Models/interfaces/app-totp-wrapper.interface';
import * as qrcode from 'qrcode';
import * as base32 from 'hi-base32'
import { PasswordEncoderService } from './password-encoder.service';

@Injectable()
export class SercurityService {

    private readonly totpConf: Omit<TotpConfiguration, 'totpPepper'>
    private readonly totpPepper: string
    private readonly AES_secret: string
    private readonly deviceIdSignatureSecret: string

    constructor(private readonly configService: ConfigService, private readonly pe: PasswordEncoderService) {
        const { totpPepper, ...totpConf } = this.configService.get<TotpConfiguration>('Totp')!
        this.totpConf = totpConf
        this.totpPepper = totpPepper
        this.AES_secret = this.configService.get<string>('App.AES_secret')!
        this.deviceIdSignatureSecret = this.configService.get<string>('App.deviceIdSignatureSecret')!
    }

    encrypt_AES256(value: string) {
        const key = Buffer.from(this.AES_secret, 'base64')
        const iv = randomBytes(12)
        const cipher = createCipheriv('aes-256-gcm', key, iv)
        const encrypted = Buffer.concat([
            cipher.update(value, 'utf8'),
            cipher.final(),
        ])
        const tag = cipher.getAuthTag()
        return Buffer.concat([iv, tag, encrypted]).toString('hex')
    }

    decrypt_AES256(payload: string) {
        const key = Buffer.from(this.AES_secret, 'base64')
        const data = Buffer.from(payload, 'hex')
        const iv = data.subarray(0, 12)
        const tag = data.subarray(12, 28)
        const text = data.subarray(28)

        const decipher = createDecipheriv('aes-256-gcm', key, iv)
        decipher.setAuthTag(tag)
        const decrypted = Buffer.concat([
            decipher.update(text),
            decipher.final()
        ])
        return decrypted.toString('utf8')
    }

    signDeviceId(deviceId: UUID): string {
        const signature = createHmac('sha256', this.deviceIdSignatureSecret)
            .update(deviceId)
            .digest('hex')
        return `${deviceId}.${signature}`
    }


    /**
     * Dal segreto salvato in db viene creato un hmac con un segreto salvato sulle variabili d'ambiente
     * Se viene leakato il segreto dal db non sarà quindi sufficiente per generare TOTP validi
     */
    private derivePepperedBase32Secret(rawBase32: string): string {

        const rawBytes = Buffer.from(base32.decode.asBytes(rawBase32))
        const hmacBytes = createHmac('sha256', this.totpPepper)
            .update(rawBytes)
            .digest()
        // re-encode in base32 (senza padding =)
        const derived = base32.encode(hmacBytes).toString().replace(/=+$/, '')
        return derived
    }

    /** 
     * Genera un segreto base32 da salvare sul db
     */
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

    public generateAppTotpSecret(email: string): AppTotpWrapper {

        const baseName = this.configService.get<string>('App.globalName')!

        const rawSecret = speakeasy.generateSecret({
            name: baseName,
            length: this.totpConf.bytes,
            issuer: baseName
        })

        const algorithm = 'SHA1'

        // secret effettivo usato dall’app di autenticazione
        const derivedBase32 = this.derivePepperedBase32Secret(rawSecret.base32)

        const label = encodeURIComponent(baseName)
        const issuer = encodeURIComponent(baseName)

        const otpauth_url =
            `otpauth://totp/${label}:${email}?secret=${derivedBase32}` +
            `&issuer=${issuer}` +
            `&algorithm=${algorithm}` +
            `&digits=${this.totpConf.digits}`

        return {
            totpSecret: rawSecret.base32, // questo va in DB
            otpauth_url
        }
    }


    public generateTotp(base32Secret: string): TotpWrapper {

        const derivedSecret = this.derivePepperedBase32Secret(base32Secret)

        const TOTP = speakeasy.totp({
            secret: derivedSecret,
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


    public verifyTotp(totp: string, base32Secret: string, app = false): boolean {

        const derivedSecret = this.derivePepperedBase32Secret(base32Secret)

        return speakeasy.totp.verify({
            secret: derivedSecret,
            encoding: 'base32',
            token: totp,
            digits: this.totpConf.digits,
            step: app ? 30 : this.totpConf.period,
            algorithm: app ? 'sha1' : 'sha256',
            window: 1
        })

    }


    public generateReadableCode(): string {
        const raw = randomBytes(6).toString('hex') // 12 caratteri esadecimali (6 byte)
        const chunks = raw.match(/.{1,4}/g)         // Spezza in blocchi da 4 caratteri
        return chunks?.join('-') ?? raw            // Formatta tipo: "8f4a-d20b-c7e9"
    }

    public generateAccountRecoveryReadableCode(): string {
        const raw = randomBytes(32).toString('hex')
        const chunks = raw.match(/.{1,4}/g)?.map((hex) => parseInt(hex, 16).toString().padStart(5, '0'))
        return chunks?.join('-') ?? raw // 27669-46565-09790-45140-26341-64007-40932-48517-14657-40313-25075-51614-21752-51491-50369-20601
    }

    public maskEmail(email: string): string {

        email = email.trim().toLowerCase()

        const [localPart = '', domain] = email.split('@')

        const localStarsLen = Math.max(localPart.length - 4, 10)

        if (!domain) {
            const maskedLocal =
                localPart.slice(0, 2) +
                '*'.repeat(localStarsLen) +
                localPart.slice(-2)

            return maskedLocal + '@'
        }

        const domainParts = domain.split('.')
        const extension = domainParts.pop() || ''
        const domainWithoutExt = domainParts.join('.')

        const visibleDomain = domainWithoutExt.slice(-2)

        const domainStarsLen = Math.max(domainWithoutExt.length - 2, 3)
        const maskedDomain = '*'.repeat(domainStarsLen)

        const maskedLocal =
            localPart.slice(0, 2) +
            '*'.repeat(localStarsLen) +
            localPart.slice(-2)

        return `${maskedLocal}@${maskedDomain}${visibleDomain}.${extension}`
    }


    maskPhone(phone: string): string {
        return phone.slice(0, 3) + '*'.repeat(8) + phone.slice(-2)
    }




}
