export type ExternalHttpErrorKind =
    | 'cancellation'
    | 'timeout'
    | 'dns'
    | 'connect'
    | 'tls'
    | 'network'
    | 'http'
    | 'protocol'

export class ExternalHttpError extends Error {
    constructor(
        readonly kind: ExternalHttpErrorKind,
        message: string,
        readonly details: Readonly<{
            method: string
            host: string
            status?: number
            attempts: number
        }>,
        options: { cause?: unknown } = {},
    ) {
        super(message, options)
        this.name = 'ExternalHttpError'
    }
}
