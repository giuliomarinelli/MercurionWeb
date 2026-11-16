export interface RawFingerprintData {
  audio: Audio
  hardware: Hardware
  locales: Locales
  permissions: Permissions
  plugins: Plugins
  screen: Screen
  system: System
  webgl: Webgl
  math: Math
}

export interface Audio {
  sampleHash: number
  oscillator: string
  maxChannels: number
  channelCountMode: string
}

export interface Hardware {
  videocard: Videocard
  architecture: number
  deviceMemory: string
  jsHeapSizeLimit: number
}

export interface Videocard {
  vendor: string
  renderer: string
  version: string
  shadingLanguageVersion: string
}

export interface Locales {
  languages: string
  timezone: string
}

export interface Permissions {
  camera: string
  geolocation: string
  microphone: string
  midi: string
  notifications: string
  "persistent-storage": string
  push: string
  "storage-access": string
}

export interface Plugins {
  plugins: string[]
}

export interface Screen {
  is_touchscreen: boolean
  maxTouchPoints: number
  colorDepth: number
  mediaMatches: string[]
}

export interface System {
  platform: string
  cookieEnabled: boolean
  productSub: string
  product: string
  useragent: string
  hardwareConcurrency: number
  browser: Browser
  applePayVersion: number
}

export interface Browser {
  name: string
  version: string
}

export interface Webgl {
  commonImageHash: string
}

export interface Math {
  acos: number
  asin: number
  atan: number
  cos: number
  cosh: number
  e: number
  largeCos: number
  largeSin: number
  largeTan: number
  log: number
  pi: number
  sin: number
  sinh: number
  sqrt: number
  tan: number
  tanh: number
}
