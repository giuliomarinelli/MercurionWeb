import type {
  FingerprintData,
  SessionDeviceInfo
} from '@mercurion/rest-contracts'

export const legacyFingerprintFixture: FingerprintData = {
  audio: { sampleHash: 1, oscillator: 'osc', maxChannels: 2 },
  hardware: { videocard: { vendor: 'vendor', renderer: 'renderer' } },
  locales: { languages: 'en-US' },
  plugins: { plugins: ['PDF'] },
  screen: { is_touchscreen: false, colorDepth: 24 },
  system: {
    platform: 'Win32',
    productSub: '20030107',
    product: 'Gecko',
    hardwareConcurrency: 8
  },
  webgl: { commonImageHash: 'hash' },
  math: { acos: 1, cos: 2, log: 3, pi: 4, sqrt: 5 }
}

export const legacySessionDeviceInfoFixture: SessionDeviceInfo = {
  osPlatform: 'Win32',
  useragent: 'Mercurion test browser',
  browser: { name: 'Chrome', version: '128' }
}
