import { FastifyRequest } from 'fastify'

const WINDOW_MIN = 4
const scale = (n: number) => n * WINDOW_MIN

function normalizeRoutePath(path?: string): string {
    if (!path) return '/'
    const [rawPath] = path.split('?')
    const trimmed = rawPath.replace(/\/+$/, '').trim().toLowerCase()
    if (!trimmed) return '/'
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function resolveRateLimitPath(req: FastifyRequest): string {
    const routeUrl = req.routeOptions?.url
    return normalizeRoutePath(routeUrl ?? req.url)
}

export function routeAwareMax(req: FastifyRequest): number {

    // TODO: implementare il rate limiting per le nuove rotte: qui su fastify (binding con IP + deviceId) e, se necessario, su Redis (binding diretto con l'account)

    const method = (req.method || 'GET').toUpperCase()

    // ignora metodi non significativi per il rate limit
    if (method === 'OPTIONS' || method === 'HEAD') {
        return Number.MAX_SAFE_INTEGER
    }

    const path = resolveRateLimitPath(req)

    if (method === 'POST' && path.startsWith('/api/authentication/login/1'))
        return scale(4)

    if (
        method === 'POST' &&
        path.startsWith('/api/authentication/login/') &&
        /\/2$/.test(path)
    )
        return scale(3)

    if (
        method === 'POST' &&
        path.startsWith('/api/authentication/login/') &&
        /\/3$/.test(path)
    )
        return scale(6)

    if (method === 'GET' && path === '/api/authentication/ws-refresh')
        return scale(60)

    if (
        (method === 'DELETE' || method === 'PATCH') &&
        path.startsWith('/api/authentication/logout')
    )
        return scale(30)


    if (method === 'POST' && path === '/api/account/register') return scale(12)
    if (method === 'PATCH' && path === '/api/account/activate') return scale(12)

    if (method === 'PATCH' && path === '/api/account/email/1') return scale(6)
    if (method === 'PATCH' && path === '/api/account/email/2') return scale(10)
    if (method === 'PATCH' && path === '/api/account/phone/1') return scale(4)
    if (method === 'PATCH' && path === '/api/account/phone/2') return scale(8)

    if (method === 'PATCH' && path.startsWith('/api/account/mfa/enable/') && /\/1$/.test(path)) return scale(6)
    if (method === 'PATCH' && path.startsWith('/api/account/mfa/enable/') && /\/2$/.test(path)) return scale(6)

    if (method === 'PATCH' && path.startsWith('/api/account/mfa/disable/') && /\/1$/.test(path)) return scale(6)
    if (method === 'PATCH' && path.startsWith('/api/account/mfa/disable/') && /\/2$/.test(path)) return scale(6)

    if (method === 'PATCH' && path === '/api/account/password') return scale(10)

    if (method === 'POST' && path === '/api/account/forgotten-password') return scale(5)
    if (method === 'PATCH' && path === '/api/account/password-recovery') return scale(8)
    if (method === 'GET' && path === '/api/account/is-authorized-to-recover-password') return scale(30)

    if (method === 'POST' && path === '/api/account/is-email-available') return scale(20)

    if (method === 'GET' && path === '/api/account/email') return scale(60)

    if (method === 'GET' && path === '/api/account/active-sessions') return scale(40)

    if (method === 'GET' && path === '/api/account/mfa/backup/status')
        return scale(30)

    if (method === 'PATCH' && path === '/api/account/mfa/backup/regenerate')
        return scale(6)

    if (method === 'POST' && path === '/api/documents/upload') return scale(4)

    if (method === 'POST' && path === '/api/account/recovery/1')
        return scale(2)
    
    if (method === 'POST' && path === '/api/account/recovery/2')
        return scale(2)

    return scale(100)
}
