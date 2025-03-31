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