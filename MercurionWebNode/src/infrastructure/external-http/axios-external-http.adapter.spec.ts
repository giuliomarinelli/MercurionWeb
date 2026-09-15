import axios from 'axios'
import { AxiosExternalHttpAdapter } from './axios-external-http.adapter'
import { ExternalHttpError } from './external-http.error'
import { LoggerPort } from 'src/logging/logger.port'

jest.mock('axios', () => ({
    __esModule: true,
    default: {
        request: jest.fn(),
        isAxiosError: (value: unknown) => Boolean((value as { isAxiosError?: boolean })?.isAxiosError),
    },
}))

describe('AxiosExternalHttpAdapter', () => {
    const request = (axios as unknown as { request: jest.Mock }).request
    const logger = { debug: jest.fn(), warn: jest.fn() }
    const metrics = { record: jest.fn() }
    let adapter: AxiosExternalHttpAdapter

    beforeEach(() => {
        request.mockReset()
        metrics.record.mockReset()
        adapter = new AxiosExternalHttpAdapter(logger as unknown as LoggerPort, metrics)
    })

    it('uses the finite timeout and decodes JSON responses', async () => {
        request.mockResolvedValue({
            status: 200,
            headers: { 'content-type': 'application/json' },
            data: '{"ok":true}',
            config: { method: 'get', url: 'https://provider.test/profile' },
        })

        await expect(adapter.get<{ ok: boolean }>('https://provider.test/profile', {
            timeoutMs: 5_000,
            responseType: 'json',
        })).resolves.toMatchObject({ status: 200, data: { ok: true } })
        expect(request).toHaveBeenCalledWith(expect.objectContaining({
            timeout: 5_000,
            validateStatus: expect.any(Function),
        }))
    })

    it('normalizes HTTP failures without exposing response bodies', async () => {
        request.mockResolvedValue({
            status: 401,
            headers: {},
            data: { token: 'secret' },
            config: { method: 'get', url: 'https://provider.test/profile' },
        })

        await expect(adapter.get('https://provider.test/profile', { timeoutMs: 1_000 }))
            .rejects.toMatchObject({ kind: 'http', details: { status: 401 } })
        expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({
            kind: 'http',
            status: 401,
        }))
        expect(logger.warn.mock.calls[0][0]).not.toHaveProperty('data')
    })

    it('classifies timeout, network and cancellation failures', async () => {
        const timeout = Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ETIMEDOUT' })
        request.mockRejectedValueOnce(timeout)
        await expect(adapter.get('https://provider.test', { timeoutMs: 100 }))
            .rejects.toMatchObject({ kind: 'timeout' })

        const network = Object.assign(new Error('dns'), { isAxiosError: true, code: 'ENOTFOUND' })
        request.mockRejectedValueOnce(network)
        await expect(adapter.get('https://provider.test', { timeoutMs: 100 }))
            .rejects.toMatchObject({ kind: 'dns' })

        const controller = new AbortController()
        controller.abort()
        request.mockRejectedValueOnce(Object.assign(new Error('cancelled'), {
            isAxiosError: true,
            code: 'ERR_CANCELED',
        }))
        await expect(adapter.get('https://provider.test', { timeoutMs: 100, signal: controller.signal }))
            .rejects.toMatchObject({ kind: 'cancellation' })
    })

    it('classifies malformed JSON as a protocol failure', async () => {
        request.mockResolvedValue({
            status: 200,
            headers: {},
            data: '{malformed',
            config: { method: 'get', url: 'https://provider.test' },
        })

        await expect(adapter.get('https://provider.test', {
            timeoutMs: 1_000,
            responseType: 'json',
        })).rejects.toMatchObject({ kind: 'protocol' })
    })

    it('retries explicitly eligible GET statuses but never unsafe OAuth POSTs', async () => {
        request
            .mockResolvedValueOnce({ status: 503, headers: {}, data: {}, config: { method: 'get', url: 'https://provider.test' } })
            .mockResolvedValueOnce({ status: 200, headers: {}, data: { ok: true }, config: { method: 'get', url: 'https://provider.test' } })
        await expect(adapter.get('https://provider.test', {
            timeoutMs: 1_000,
            retry: { enabled: true, maxAttempts: 2, retryStatuses: [503] },
        })).resolves.toMatchObject({ data: { ok: true } })
        expect(request).toHaveBeenCalledTimes(2)

        request.mockClear()
        request.mockResolvedValue({ status: 503, headers: {}, data: {}, config: { method: 'post', url: 'https://provider.test' } })
        await expect(adapter.post('https://provider.test', {}, {
            timeoutMs: 1_000,
            retry: { enabled: true, maxAttempts: 3, retryStatuses: [503] },
        })).rejects.toBeInstanceOf(ExternalHttpError)
        expect(request).toHaveBeenCalledTimes(1)
    })

    it('rejects invalid or unbounded timeout configuration', async () => {
        await expect(adapter.get('https://provider.test', { timeoutMs: 0 }))
            .rejects.toMatchObject({ kind: 'protocol' })
        await expect(adapter.get('https://provider.test', { timeoutMs: 120_001 }))
            .rejects.toMatchObject({ kind: 'protocol' })
    })
})
