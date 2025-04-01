export interface TotpWrapper {

    TOTP: string
    generatedAt: number
    expiresAt: number

}

export type TotpMetadata = Omit<TotpWrapper, 'TOTP'>

export type TotpAuthMetadata = TotpMetadata & {
    secret?: string
    otpauthUrl?: string
}

export type MfaAuthMetadata = TotpAuthMetadata & { secureToken: string }