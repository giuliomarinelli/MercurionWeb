import {
    epochMsFromUtcInstant,
    parseUtcInstant,
    utcInstantFromDate,
    utcInstantFromEpochMs
} from './temporal'

describe('UTC temporal contract', () => {
    const epochMs = Date.UTC(2026, 0, 2, 3, 4, 5, 678)

    it('normalizes instants to millisecond UTC wire precision', () => {
        const instant = utcInstantFromEpochMs(epochMs)

        expect(instant).toBe('2026-01-02T03:04:05.678Z')
        expect(epochMsFromUtcInstant(instant)).toBe(epochMs)
        expect(utcInstantFromDate(new Date(epochMs))).toBe(instant)
    })

    it('rejects timezone-less, invalid, and non-millisecond public values', () => {
        expect(() => parseUtcInstant('2026-01-02T03:04:05')).toThrow(RangeError)
        expect(() => parseUtcInstant('2026-01-02T04:04:05.678+01:00')).toThrow(RangeError)
        expect(() => parseUtcInstant('2026-02-30T03:04:05.678Z')).toThrow(RangeError)
        expect(() => parseUtcInstant('2026-01-02T03:04:05.6789Z')).toThrow(RangeError)
    })
})
