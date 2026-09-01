export interface FingerprintData {
  audio: Audio
  hardware: Hardware
  locales: Locales
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
}

export interface Hardware {
  videocard: Videocard
}

export interface Videocard {
  vendor: string
  renderer: string
}

export interface Locales {
  languages: string
}

export interface Plugins {
  plugins: string[]
}

export interface Screen {
  is_touchscreen: boolean
  colorDepth: number
}

export interface System {
  platform: string
  productSub: string
  product: string
  hardwareConcurrency: number
}

export interface Webgl {
  commonImageHash: string
}

export interface Math {
  acos: number
  cos: number
  log: number
  pi: number
  sqrt: number
}
