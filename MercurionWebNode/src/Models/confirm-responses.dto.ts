
import { Authentication } from "src/app_modules/auth/Models/interfaces/authentication.interface"
import { MfaAuthMetadata, TotpMetadata } from "src/app_modules/auth/Models/interfaces/totp-wrapper.interface"

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

export type ConfirmChangeDTO = ConfirmWithObsContDTO & TotpMetadata & {
    emailVerificationToken?: string
    phoneNumberVerificationToken?: string
}

export type Confirm_Login_FirstStepDTO = ConfirmDTO & Omit<Authentication, 'userId' | 'sessionId'> & {
    preAuthorizationToken?: string
    accessToken?: string
}