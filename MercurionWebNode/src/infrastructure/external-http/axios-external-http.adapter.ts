import { Injectable } from '@nestjs/common'
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { LoggerPort } from 'src/logging/logger.port'
import { ExternalHttpError, ExternalHttpErrorKind } from './external-http.error'
import {
    ExternalHttpPort,
    ExternalHttpRequest,
    ExternalHttpResponse,
} from './external-http.port'
import { ExternalHttpMetricsPort } from './external-http.metrics'

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_STATUSES = [408, 425, 429, 500, 502, 503, 504] as const

@Injectable()
export class AxiosExternalHttpAdapter extends ExternalHttpPort {
    constructor(
        private readonly logger: LoggerPort,
        private readonly metrics: ExternalHttpMetricsPort,
    ) {
        super()
    }

    async request<TResponse, TBody = unknown>(
        request: ExternalHttpRequest<TBody>,
    ): Promise<ExternalHttpResponse<TResponse>> {
        const target = validateRequest(request)
        const retry = retryPlan(request)
        let attempt = 0
        const startedAt = Date.now()

        while (true) {
            attempt += 1
            try {
                const response = await axios.request<TResponse>({
                    method: request.method,
                    url: request.url,
                    headers: request.headers,
                    data: request.body,
                    timeout: request.timeoutMs,
                    signal: request.signal,
                    responseType: request.responseType === 'bytes'
                        ? 'arraybuffer'
                        : request.responseType ?? 'json',
                    validateStatus: () => true,
                } satisfies AxiosRequestConfig<TBody>)

                if (response.status < 200 || response.status >= 300) {
                    const error = new ExternalHttpError(
                        'http',
                        `External HTTP request returned status ${response.status}`,
                        { method: request.method, host: target.host, status: response.status, attempts: attempt },
                    )
                    if (attempt < retry.maxAttempts && retry.statuses.has(response.status)) {
                        continue
                    }
                    throw error
                }

                const data = decodeResponse<TResponse>(response, request.responseType)
                this.recordSuccess(request.method, target.host, response.status, startedAt)
                return {
                    status: response.status,
                    headers: normalizeHeaders(response.headers),
                    data,
                }
            } catch (cause) {
                if (cause instanceof ExternalHttpError && cause.kind === 'http' &&
                    attempt >= retry.maxAttempts) {
                    this.recordFailure(request.method, target.host, cause, startedAt)
                    throw cause
                }

                const error = cause instanceof ExternalHttpError
                    ? cause
                    : classifyAxiosError(cause, request, target.host, attempt)
                if (error.kind === 'http' && attempt < retry.maxAttempts &&
                    retry.statuses.has(error.details.status ?? 0)) {
                    continue
                }
                this.recordFailure(request.method, target.host, error, startedAt)
                throw error
            }
        }
    }

    private recordSuccess(method: string, host: string, status: number, startedAt: number): void {
        const latencyMs = Date.now() - startedAt
        this.metrics.record({ method, host, outcome: 'success', status, latencyMs })
        this.logger.debug({ event: 'external_http.completed', method, host, status, latencyMs })
    }

    private recordFailure(method: string, host: string, error: ExternalHttpError, startedAt: number): void {
        const latencyMs = Date.now() - startedAt
        this.metrics.record({
            method,
            host,
            outcome: 'failure',
            status: error.details.status,
            kind: error.kind,
            latencyMs,
        })
        this.logger.warn({ event: 'external_http.failed', method, host, status: error.details.status, kind: error.kind, latencyMs })
    }
}

function validateRequest(request: ExternalHttpRequest): URL {
    if (!Number.isFinite(request.timeoutMs) || request.timeoutMs < 1 || request.timeoutMs > 120_000) {
        throw new ExternalHttpError('protocol', 'External HTTP timeout must be between 1 and 120000ms', {
            method: request.method,
            host: 'unknown',
            attempts: 0,
        })
    }
    let target: URL
    try {
        target = new URL(request.url)
    } catch (cause) {
        throw new ExternalHttpError('protocol', 'External HTTP URL is invalid', {
            method: request.method,
            host: 'unknown',
            attempts: 0,
        }, { cause })
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        throw new ExternalHttpError('protocol', 'External HTTP URL must use HTTP or HTTPS', {
            method: request.method,
            host: target.host,
            attempts: 0,
        })
    }
    return target
}

function retryPlan(request: ExternalHttpRequest): { maxAttempts: number; statuses: Set<number> } {
    const policy = request.retry
    if (!policy?.enabled) return { maxAttempts: 1, statuses: new Set() }
    const safeMethod = request.method === 'GET'
    const unsafeAllowed = Boolean(policy.allowUnsafeMethods && request.idempotencyKey)
    if (!safeMethod && !unsafeAllowed) return { maxAttempts: 1, statuses: new Set() }
    const maxAttempts = Math.max(1, Math.min(policy.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, 5))
    return {
        maxAttempts,
        statuses: new Set(policy.retryStatuses ?? DEFAULT_RETRY_STATUSES),
    }
}

function decodeResponse<TResponse>(
    response: AxiosResponse<TResponse>,
    responseType: ExternalHttpRequest['responseType'],
): TResponse {
    if (responseType !== 'json' || typeof response.data !== 'string') return response.data
    try {
        return JSON.parse(response.data) as TResponse
    } catch (cause) {
        throw new ExternalHttpError('protocol', 'External HTTP response was not valid JSON', {
            method: String(response.config.method).toUpperCase(),
            host: new URL(response.config.url ?? '').host,
            status: response.status,
            attempts: 1,
        }, { cause })
    }
}

function classifyAxiosError(
    cause: unknown,
    request: ExternalHttpRequest,
    host: string,
    attempts: number,
): ExternalHttpError {
    if (request.signal?.aborted || (axios.isAxiosError(cause) && cause.code === 'ERR_CANCELED')) {
        return new ExternalHttpError('cancellation', 'External HTTP request was cancelled', {
            method: request.method, host, attempts,
        }, { cause })
    }
    if (axios.isAxiosError(cause)) {
        const error = cause as AxiosError
        const kind: ExternalHttpErrorKind =
            error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ? 'timeout' :
                error.code === 'ENOTFOUND' ? 'dns' :
                    error.code === 'ECONNREFUSED' ? 'connect' :
                        error.code === 'EPROTO' || error.code === 'CERT_HAS_EXPIRED' ? 'tls' : 'network'
        return new ExternalHttpError(kind, `External HTTP request failed (${kind})`, {
            method: request.method, host, attempts,
        }, { cause })
    }
    return new ExternalHttpError('protocol', 'External HTTP request failed', {
        method: request.method, host, attempts,
    }, { cause })
}

function normalizeHeaders(headers: AxiosResponse['headers']): Readonly<Record<string, string>> {
    return Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value)]),
    )
}
