export interface TotpWrapper {

    TOTP: string
    generatedAt: number
    expiresAt: number

}

export type TotpMetadata = Omit<TotpWrapper, 'TOTP'>