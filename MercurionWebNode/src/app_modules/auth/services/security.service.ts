import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { TotpConfiguration } from 'src/config/config.types';
import { createCipheriv, createDecipheriv, createHmac, randomBytes, UUID } from 'crypto';
import * as speakeasy from 'speakeasy'
import { TotpWrapper } from '../models/interfaces/totp-wrapper.interface';
import { AppTotpWrapper } from '../models/interfaces/app-totp-wrapper.interface';
import * as qrcode from 'qrcode';
import * as base32 from 'hi-base32'
import { PasswordEncoderService } from './password-encoder.service';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { ApplicationError, ApplicationErrorCode } from 'src/exception-handling/application-error';

@Injectable()
export class SecurityService {

    private readonly totpConf: Omit<TotpConfiguration, 'totpPepper'>
    private readonly totpPepper: string
    private readonly AES_secret: string
    private readonly USER_ID_AES_ENCRYPTION_SECRET: string
    private readonly deviceIdSignatureSecret: string

    constructor(private readonly configService: ConfigService, private readonly pe: PasswordEncoderService) {
        const { totpPepper, ...totpConf } = this.configService.get<TotpConfiguration>('Totp')!
        this.totpConf = totpConf
        this.totpPepper = totpPepper
        this.AES_secret = this.configService.get<string>('App.AES_secret')!
        this.USER_ID_AES_ENCRYPTION_SECRET = this.configService.get<string>('App.userId_AES_encryptionSecret')!
        this.deviceIdSignatureSecret = this.configService.get<string>('App.deviceIdSignatureSecret')!
    }

    encrypt_AES256_GCM(value: string, secret?: string) {
        const key = secret
            ? Buffer.from(secret, 'base64').subarray(0, 32)
            : Buffer.from(this.AES_secret, 'base64')
        const iv = randomBytes(12)
        const cipher = createCipheriv('aes-256-gcm', key, iv)
        const encrypted = Buffer.concat([
            cipher.update(value, 'utf8'),
            cipher.final(),
        ])
        const tag = cipher.getAuthTag()
        return Buffer.concat([iv, tag, encrypted]).toString('hex')
    }

    decrypt_AES256_GCM(payload: string, secret?: string) {
        const key = secret
            ? Buffer.from(secret, 'base64').subarray(0, 32)
            : Buffer.from(this.AES_secret, 'base64')
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

    /**
     * Decifra il claim `sub` opaco contenuto nei JWT gestiti dall'applicazione e
     * restituisce l'identificativo utente che il backend usa internamente.
     *
     * Il `sub` dei token Mercurion non è più lo `userId` in chiaro: è il risultato
     * di `encryptUserId`, protetto con AES-256-GCM e con una chiave dedicata agli
     * identificativi utente. Questa separazione mantiene lo userId nel perimetro
     * backend e impedisce ai consumatori del JWT di leggerlo direttamente dal
     * payload. Il token continua comunque a essere un JWT firmato e i suoi altri
     * claim restano leggibili; questa cifratura non sostituisce la verifica della
     * firma, del tipo, della sessione o delle autorizzazioni del token.
     *
     * Chiamare questo metodo solo dopo aver verificato il JWT e solo nel backend,
     * prima di usare l'identificativo in query, autorizzazioni o operazioni di
     * dominio. Token legacy con `sub` in chiaro non sono compatibili con questo
     * formato e falliscono la decifratura o la validazione dell'UUID.
     *
     * @param encryptedUserId Claim `sub` cifrato estratto da un JWT verificato.
     * @returns Lo userId UUID in chiaro, da mantenere nell'ambito backend.
     * @throws ApplicationError Se il valore decifrato non è un UUID valido.
     * @throws Error Se il payload non è cifrato correttamente o non supera
     * l'autenticazione AES-GCM (inclusi chiave, IV o tag non validi).
     */
    public decryptUserId(encryptedUserId: string): UUID {
        const result = this.decrypt_AES256_GCM(encryptedUserId, this.USER_ID_AES_ENCRYPTION_SECRET)
        if (!GeneralUtils.isValidUUID(result)) {
            throw new ApplicationError(
                ApplicationErrorCode.PUBLIC_ID_INVALID,
                `Invalid UUID for userId`,
                { field: 'userId' }
            )
        }
        return result as UUID
    }

    /**
     * Converte lo userId interno nel valore opaco da inserire nel claim `sub`
     * di ogni JWT emesso dall'applicazione.
     *
     * Questo metodo applica il cambio di paradigma del contratto d'identità:
     * `sub` non rappresenta più lo userId in chiaro, ma un ciphertext AES-256-GCM
     * prodotto con una chiave dedicata agli identificativi. Un IV casuale viene
     * generato a ogni cifratura, perciò token diversi per lo stesso utente non
     * espongono un `sub` stabile e direttamente confrontabile. Solo il backend,
     * che conserva la chiave, può recuperare lo userId tramite `decryptUserId`.
     *
     * Passare lo userId solo al momento della firma del token; non persistere né
     * riutilizzare il ciphertext come identità applicativa. Il JWT resta firmato
     * secondo il proprio algoritmo: la cifratura del `sub` non cifra gli altri
     * claim né sostituisce la firma. La chiave dedicata deve essere configurata
     * come segreto server e mantenuta stabile per la durata dei token che devono
     * ancora essere decifrati.
     *
     * @param userId Identificativo UUID in chiaro valido, interno al backend.
     * @returns Il ciphertext codificato in esadecimale da usare come claim `sub`.
     * @throws ApplicationError Se `userId` non è un UUID valido.
     */
    public encryptUserId(userId: UUID): string {
        if (!GeneralUtils.isValidUUID(userId)) {
            throw new ApplicationError(
                ApplicationErrorCode.PUBLIC_ID_INVALID,
                `Invalid UUID for userId`,
                { field: 'userId' }
            )
        }
        return this.encrypt_AES256_GCM(userId, this.USER_ID_AES_ENCRYPTION_SECRET)
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
    public generateSecret(bytes: number, encoding: 'hex' | 'base32' | 'base64'): string {

        const buffer: Buffer = randomBytes(bytes)
        const hexPrefix: string = "0x"
        switch (encoding) {
            case 'base32':
                return speakeasy.generateSecret({ length: bytes }).base32

            case 'base64':
                return buffer.toString(encoding)

            case 'hex':
                return hexPrefix + buffer.toString(encoding)
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
