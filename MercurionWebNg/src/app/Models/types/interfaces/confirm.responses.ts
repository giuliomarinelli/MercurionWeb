
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

// export type ConfirmMfaChange = ConfirmDTO & MfaAuthMetadata

// export type ConfirmChangeDTO = ConfirmWithObsContDTO & TotpMetadata & {
//     emailVerificationToken?: string
//     phoneNumberVerificationToken?: string
// }

// export type Confirm_Login_FirstStepDTO = ConfirmDTO & Omit<Authentication, 'userId' | 'sessionId'> & {
//     preAuthorizationToken?: string
//     accessToken?: string
// }

// export type ConfirmWithTotpMetaDTO = ConfirmDTO & TotpMetadata
