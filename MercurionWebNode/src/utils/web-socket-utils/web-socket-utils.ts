export class WebSocketUtils {
    public static parseCookie(rawCookieHeader?: string): Record<string, string> {
        const cookies: Record<string, string> = {}
        if (typeof rawCookieHeader !== 'string' || !rawCookieHeader) {
            return cookies
        }
        rawCookieHeader.split(';').forEach(rawCookie => {
            const [keyPart, ...valParts] = rawCookie.trim().split('=')
            const key = keyPart?.trim()
            const val = valParts.join('=').trim()
            if (key) {
                cookies[key] = decodeURIComponent(val || '')
            }
        })
        return cookies
    }
}
