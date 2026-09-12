import {
    redisDurations,
    redisKeys,
    ttlSeconds
} from './redis-contracts'

describe('Redis key and TTL contracts', () => {
    it('keeps every governed owner namespace distinct for the same identifiers', () => {
        const userId = '11111111-1111-4111-8111-111111111111'
        const sessionId = '22222222-2222-4222-8222-222222222222'
        const jti = 'jti'

        const keys = [
            redisKeys.session.record(sessionId, userId),
            redisKeys.session.userIndex(userId),
            redisKeys.token.issued(sessionId, jti),
            redisKeys.token.revoked(jti),
            redisKeys.trust.fingerprint(userId, 'fingerprint'),
            redisKeys.trust.location(userId),
            redisKeys.trust.device(userId),
            redisKeys.authentication.loginFailures('user@example.test'),
            redisKeys.authentication.loginLock('user@example.test'),
            redisKeys.mfa.preAuthorizationDevice(jti),
            redisKeys.feedback.sendCount(userId),
            redisKeys.feedback.sendLock(userId),
            redisKeys.oauth.accessToken('google', userId),
            redisKeys.oauth.refreshLock('google', userId),
            redisKeys.sso.state('google', 'hashed-state')
        ]

        expect(new Set(keys).size).toBe(keys.length)
    })

    it('preserves representative key formats and owner vocabulary', () => {
        expect(redisKeys.session.record('sid', 'uid')).toBe('session:sid:uid')
        expect(redisKeys.session.recordsByUser('uid')).toBe('session:*:uid')
        expect(redisKeys.token.issued('sid', 'jti')).toBe('issued:sid:jti')
        expect(redisKeys.mfa.preAuthorizationDevice('jti')).toBe('mfa:pat:dev:jti')
        expect(redisKeys.oauth.accessToken('dropbox')).toBe('access_token:dropbox')
        expect(redisKeys.sso.state('google', 'hash')).toBe('oauth2:state:google:hash')
    })

    it('makes Redis expiry units explicit and rejects invalid durations', () => {
        expect(redisDurations.minutes(10)).toBe(600)
        expect(redisDurations.hours(2)).toBe(7200)
        expect(redisDurations.days(30)).toBe(2592000)
        expect(() => ttlSeconds(0)).toThrow()
        expect(() => ttlSeconds(1.5)).toThrow()
    })
})
