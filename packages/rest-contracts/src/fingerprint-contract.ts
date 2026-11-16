export const FINGERPRINT_CONTRACT_VERSION = 1 as const

export type FingerprintContractVersion = typeof FINGERPRINT_CONTRACT_VERSION

// Fields are optional when the browser cannot collect a signal. The browser field
// itself is always present because session rendering reads it from stored records.
export interface SessionDeviceInfo {
  osPlatform?: string
  useragent?: string
  browser: {
    name?: string
    version?: string
  }
}

// This is the stable, serializable subset of the raw fingerprinting-library result.
// Optional signals retain compatibility with browsers that omit individual probes.
export interface FingerprintData {
  audio: {
    sampleHash?: number
    oscillator?: string
    maxChannels?: number
  }
  hardware: {
    videocard: {
      vendor?: string
      renderer?: string
    }
  }
  locales: {
    languages?: string
  }
  plugins: {
    plugins?: string[]
  }
  screen: {
    is_touchscreen?: boolean
    colorDepth?: number
  }
  system: {
    platform?: string
    productSub?: string
    product?: string
    hardwareConcurrency?: number
  }
  webgl: {
    commonImageHash?: string
  }
  math: {
    acos?: number
    cos?: number
    log?: number
    pi?: number
    sqrt?: number
  }
}

export interface FingerprintContract {
  version: FingerprintContractVersion
  fingerprintData: FingerprintData
  sessionDeviceInfo: SessionDeviceInfo
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readRecord(value: unknown): UnknownRecord | undefined {
  return isRecord(value) ? value : undefined
}

function readString(value: unknown): string | undefined {
  if (value === undefined || typeof value === 'string') {
    return value
  }
  throw new TypeError('Invalid fingerprint string field')
}

function readNumber(value: unknown): number | undefined {
  if (value === undefined || (typeof value === 'number' && Number.isFinite(value))) {
    return value
  }
  throw new TypeError('Invalid fingerprint number field')
}

function readBoolean(value: unknown): boolean | undefined {
  if (value === undefined || typeof value === 'boolean') {
    return value
  }
  throw new TypeError('Invalid fingerprint boolean field')
}

function readStringArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return [...value]
  }
  throw new TypeError('Invalid fingerprint string array field')
}

function requireRecord(value: unknown, field: string): UnknownRecord {
  const record = readRecord(value)
  if (!record) {
    throw new TypeError(`Invalid fingerprint ${field}`)
  }
  return record
}

// Unknown fields are deliberately omitted so newer browser clients remain compatible
// without allowing unreviewed data to affect stored fingerprints.
export function parseFingerprintData(value: unknown): FingerprintData {
  const source = requireRecord(value, 'payload')
  const audio = requireRecord(source.audio, 'audio')
  const hardware = requireRecord(source.hardware, 'hardware')
  const videocard = requireRecord(hardware.videocard, 'hardware.videocard')
  const locales = requireRecord(source.locales, 'locales')
  const plugins = requireRecord(source.plugins, 'plugins')
  const screen = requireRecord(source.screen, 'screen')
  const system = requireRecord(source.system, 'system')
  const webgl = requireRecord(source.webgl, 'webgl')
  const math = requireRecord(source.math, 'math')

  return {
    audio: {
      sampleHash: readNumber(audio.sampleHash),
      oscillator: readString(audio.oscillator),
      maxChannels: readNumber(audio.maxChannels)
    },
    hardware: {
      videocard: {
        vendor: readString(videocard.vendor),
        renderer: readString(videocard.renderer)
      }
    },
    locales: { languages: readString(locales.languages) },
    plugins: { plugins: readStringArray(plugins.plugins) },
    screen: {
      is_touchscreen: readBoolean(screen.is_touchscreen),
      colorDepth: readNumber(screen.colorDepth)
    },
    system: {
      platform: readString(system.platform),
      productSub: readString(system.productSub),
      product: readString(system.product),
      hardwareConcurrency: readNumber(system.hardwareConcurrency)
    },
    webgl: { commonImageHash: readString(webgl.commonImageHash) },
    math: {
      acos: readNumber(math.acos),
      cos: readNumber(math.cos),
      log: readNumber(math.log),
      pi: readNumber(math.pi),
      sqrt: readNumber(math.sqrt)
    }
  }
}

export function parseSessionDeviceInfo(value: unknown): SessionDeviceInfo {
  const source = requireRecord(value, 'device info')
  const browser = requireRecord(source.browser, 'device info.browser')

  return {
    osPlatform: readString(source.osPlatform),
    useragent: readString(source.useragent),
    browser: {
      name: readString(browser.name),
      version: readString(browser.version)
    }
  }
}
