export type JwtKeyRuntimeFailure = 'REGISTRY_UNAVAILABLE' | 'MATERIAL_UNAVAILABLE' | 'INVALID_MATERIAL'
    | 'INVALID_HEADER' | 'KEY_NOT_ADMITTED' | 'ISSUANCE_UNAVAILABLE' | 'REGISTRY_CHANGED'

/** Fixed diagnostics: no token, material, provider response or raw cause crosses this boundary. */
export class JwtKeyRuntimeError extends Error {
    readonly operational: boolean

    constructor(readonly code: JwtKeyRuntimeFailure) {
        super(`JWT key operation failed: ${code}`)
        this.name = 'JwtKeyRuntimeError'
        this.operational = code === 'REGISTRY_UNAVAILABLE' || code === 'MATERIAL_UNAVAILABLE'
            || code === 'INVALID_MATERIAL' || code === 'ISSUANCE_UNAVAILABLE' || code === 'REGISTRY_CHANGED'
    }
}

export async function boundedKeyOperation<T>(operation: () => Promise<T>, milliseconds: number, code: JwtKeyRuntimeFailure): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        return await Promise.race([
            Promise.resolve().then(operation),
            new Promise<never>((_resolve, reject) => {
                timer = setTimeout(() => reject(new JwtKeyRuntimeError(code)), milliseconds)
            })
        ])
    } finally {
        clearTimeout(timer)
    }
}
