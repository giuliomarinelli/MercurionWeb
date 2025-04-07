export class InternalErrorRes {
    
    constructor(public statusCode: number, public error: string, public message?: string) { }

}


export type HttpErrorRes = InternalErrorRes & {
    timestamp: string
    requestId: string
    path: string
}