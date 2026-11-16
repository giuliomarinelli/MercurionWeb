import {
  FINGERPRINT_CONTRACT_VERSION,
  parseFingerprintData,
  parseSessionDeviceInfo
} from '@mercurion/rest-contracts'
import {
  legacyFingerprintFixture,
  legacySessionDeviceInfoFixture
} from './fixtures/fingerprint-contract.fixtures'

describe('fingerprint contract runtime validation', () => {
  it('accepts the current unversioned browser payload fixtures', () => {
    expect(parseFingerprintData(legacyFingerprintFixture)).toEqual(legacyFingerprintFixture)
    expect(parseSessionDeviceInfo(legacySessionDeviceInfoFixture)).toEqual(
      legacySessionDeviceInfoFixture
    )
  })

  it('ignores forward-compatible fields before a fingerprint is trusted', () => {
    const fingerprint = parseFingerprintData({
      ...legacyFingerprintFixture,
      futureField: 'ignored',
      system: {
        ...legacyFingerprintFixture.system,
        browserEngine: 'future'
      }
    })
    const device = parseSessionDeviceInfo({
      ...legacySessionDeviceInfoFixture,
      browser: {
        ...legacySessionDeviceInfoFixture.browser,
        brand: 'future'
      }
    })

    expect(FINGERPRINT_CONTRACT_VERSION).toBe(1)
    expect(fingerprint).toEqual(legacyFingerprintFixture)
    expect(device).toEqual(legacySessionDeviceInfoFixture)
  })

  it('rejects malformed known fingerprint and device values', () => {
    expect(() => parseFingerprintData({})).toThrow('Invalid fingerprint audio')
    expect(() => parseFingerprintData({
      ...legacyFingerprintFixture,
      audio: { ...legacyFingerprintFixture.audio, sampleHash: 'invalid' }
    })).toThrow('Invalid fingerprint number field')
    expect(() => parseSessionDeviceInfo({ browser: 'Chrome' })).toThrow(
      'Invalid fingerprint device info.browser'
    )
  })
})
