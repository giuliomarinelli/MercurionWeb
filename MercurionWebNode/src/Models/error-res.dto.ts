export type InternalErrorRes = {
    statusCode: number
    error: string
    message?: string
}


export type HttpErrorRes = InternalErrorRes & {
    timestamp: string
    requestId: string
    path: string
}