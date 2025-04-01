import { MfaAuthMetadata } from "src/app_modules/auth/Models/interfaces/totp-wrapper.interface"

export type ConfirmDTO = {
    statusCode: number
    timestamp: string
    message: string
}

export type ConfirmWithObsContDTO = ConfirmDTO & {
    obscuredEmail?: string
    obscuredPhoneNumber?: string
}

export type ConfirmWithAccessTokenDTO = ConfirmDTO & {
    accessToken: string
}

export type ConfirmMfaChange = ConfirmDTO & MfaAuthMetadata