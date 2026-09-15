import {
    epochMsFromUtcInstant,
    isUtcInstant,
    parseUtcInstant,
    utcInstantFromDate,
    utcInstantFromEpochMs
} from '@mercurion/rest-contracts'
import type { UtcInstant } from '@mercurion/rest-contracts'

export {
    epochMsFromUtcInstant,
    isUtcInstant,
    parseUtcInstant,
    utcInstantFromDate,
    utcInstantFromEpochMs
}
export type { UtcInstant }

export function utcNow(): UtcInstant {
    return utcInstantFromEpochMs(Date.now())
}

export function publicTotpMetadata<T extends {
    generatedAt: number
    expiresAt: number
}>(metadata: T): Omit<T, 'generatedAt' | 'expiresAt'> & {
    generatedAt: UtcInstant
    expiresAt: UtcInstant
} {
    return {
        ...metadata,
        generatedAt: utcInstantFromEpochMs(metadata.generatedAt),
        expiresAt: utcInstantFromEpochMs(metadata.expiresAt)
    }
}
