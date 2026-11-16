export type ExternalHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ExternalHttpResponseType = 'json' | 'text' | 'bytes'

export interface ExternalHttpRetryPolicy {
    readonly enabled: boolean
    readonly maxAttempts?: number
    readonly retryStatuses?: readonly number[]
    readonly allowUnsafeMethods?: boolean
}

export interface ExternalHttpRequest<TBody = unknown> {
    readonly method: ExternalHttpMethod
    readonly url: string
    readonly headers?: Readonly<Record<string, string>>
    readonly body?: TBody
    readonly timeoutMs: number
    readonly signal?: AbortSignal
    readonly responseType?: ExternalHttpResponseType
    readonly retry?: ExternalHttpRetryPolicy
    /**
     * Unsafe methods are only retryable when the caller supplies an
     * idempotency key and explicitly enables unsafe retries.
     */
    readonly idempotencyKey?: string
}

export interface ExternalHttpResponse<TResponse> {
    readonly status: number
    readonly headers: Readonly<Record<string, string>>
    readonly data: TResponse
}

export abstract class ExternalHttpPort {
    abstract request<TResponse, TBody = unknown>(
        request: ExternalHttpRequest<TBody>,
    ): Promise<ExternalHttpResponse<TResponse>>

    async get<TResponse>(
        url: string,
        options: Omit<ExternalHttpRequest, 'method' | 'url'>,
    ): Promise<ExternalHttpResponse<TResponse>> {
        return this.request<TResponse>({ ...options, method: 'GET', url })
    }

    async post<TResponse, TBody = unknown>(
        url: string,
        body: TBody,
        options: Omit<ExternalHttpRequest<TBody>, 'method' | 'url' | 'body'>,
    ): Promise<ExternalHttpResponse<TResponse>> {
        return this.request<TResponse, TBody>({ ...options, method: 'POST', url, body })
    }
}
