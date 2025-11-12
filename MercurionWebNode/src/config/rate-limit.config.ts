import { FastifyRequest } from 'fastify'

const WINDOW_MIN = 5; // 5 minuti
export function routeAwareMax(req: FastifyRequest): number {

    const path = req.url.split('?')[0] || ''.toLowerCase();
    const method = (req.method || 'GET').toUpperCase();

    const perMin = (n: number) => n * WINDOW_MIN; // scala per la finestra

    if (method === 'POST' && path.startsWith('/api/authentication/login/1')) return perMin(8)
    if (method === 'POST' && path.startsWith('/api/authentication/login/') && path.endsWith('/2')) return perMin(3)
    if (method === 'POST' && path.startsWith('/api/authentication/login/') && path.endsWith('/3')) return perMin(6)
    if (method === 'GET' && path === '/api/authentication/ws-refresh') return perMin(60)
    if (['DELETE', 'PATCH'].includes(method) && path.startsWith('/api/authentication/logout')) return perMin(30)
    return perMin(100)

}
