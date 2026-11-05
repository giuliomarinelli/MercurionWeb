import { JwtKeyMaterialSourceError, type JwtKeyMaterialFailure } from './jwt-key-material-source.port'

describe('Key material source error boundary', () => {
    it.each<JwtKeyMaterialFailure>(['UNAVAILABLE', 'NOT_FOUND', 'INVALID_MATERIAL'])('keeps %s diagnostics fixed and safe to serialize', code => {
        const error = new JwtKeyMaterialSourceError(code)
        expect(error.code).toBe(code)
        expect(error.message).toBe('JWT key material could not be resolved')
        expect(error.cause).toBeUndefined()
        expect(JSON.parse(JSON.stringify(error))).toEqual({ name: 'JwtKeyMaterialSourceError', code })
    })
})
