
import { LogLevel } from "@nestjs/common"
import { Authentication } from "src/app_modules/auth/Models/interfaces/authentication.interface"
import { MfaAuthMetadata, TotpMetadata } from "src/app_modules/auth/Models/interfaces/totp-wrapper.interface"

export type ConfirmDTO = {
    statusCode: number
    timestamp: string
    message: string
}

export type ConfirmWithRecoveryCodeDTO = ConfirmDTO & {
    recoveryCode: string
}

export type ConfirmWithObsContDTO = ConfirmDTO & {
    obscuredEmail?: string
    obscuredPhoneNumber?: string
}

export type ConfirmWithTokenPairAndInitialsDTO = ConfirmDTO & {
    accessToken: string
    ws_accessToken: string
    initials: string
    deviceId: string
}


export type ConfirmMfaChange = ConfirmDTO & MfaAuthMetadata

export type ConfirmChangeDTO = ConfirmWithObsContDTO & TotpMetadata & {
    emailVerificationToken?: string
    phoneNumberVerificationToken?: string
}

export type Confirm_Login_FirstStepDTO = ConfirmDTO & Omit<Authentication, 'userId' | 'sessionId' | 'deviceId'> & {
    preAuthorizationToken?: string
    accessToken?: string
    ws_accessToken?: string
    initials: string
    deviceId: string
}

export type ConfirmWithTotpMetaDTO = ConfirmDTO & TotpMetadata

export type ConfirmNewLogLevelsDTO = ConfirmDTO & {
    currentLogLevels: LogLevel[]
}

export type ConfirmWithRecoveryTokenDTO = ConfirmDTO & {
    recoveryToken: string
}