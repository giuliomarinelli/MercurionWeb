import { Injectable } from '@angular/core'

export type StorageMedium = 'local' | 'session'
export type StorageCodec<T> = {
  encode(value: T): string
  decode(raw: string): T | null
  decodeLegacy?(raw: string): T | null
}

export type StorageDescriptor<T> = {
  readonly id: string
  readonly key: string
  readonly legacyKeys: readonly string[]
  readonly medium: StorageMedium
  readonly version: number
  readonly owner: string
  readonly codec: StorageCodec<T>
}

const textCodec: StorageCodec<string> = {
  encode: value => value,
  decode: raw => raw,
  decodeLegacy: raw => raw
}

const numberCodec: StorageCodec<number> = {
  encode: value => String(value),
  decode: raw => {
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  },
  decodeLegacy: raw => {
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  }
}

function jsonCodec<T>(valid: (value: unknown) => value is T): StorageCodec<T> {
  return {
    encode: value => JSON.stringify(value),
    decode: raw => {
      try {
        const value: unknown = JSON.parse(raw)
        return valid(value) ? value : null
      } catch {
        return null
      }
    },
    decodeLegacy: raw => {
      try {
        const value: unknown = JSON.parse(raw)
        return valid(value) ? value : null
      } catch {
        return null
      }
    }
  }
}

const stringArrayCodec: StorageCodec<string[]> = {
  encode: value => btoa(JSON.stringify(value)),
  decode: raw => {
    try {
      const value: unknown = JSON.parse(atob(raw))
      return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : null
    } catch {
      return null
    }
  },
  decodeLegacy(raw) { return this.decode(raw) }
}

const themeCodec: StorageCodec<Record<string, unknown>> = {
  encode: value => JSON.stringify(value),
  decode: raw => {
    try {
      const value: unknown = JSON.parse(raw)
      return value && typeof value === 'object' ? value as Record<string, unknown> : null
    } catch { return null }
  },
  decodeLegacy: raw => {
    if (raw !== 'dark' && raw !== 'light') return null
    return { theme: raw, themeOwner: 'User', isEnabled: true }
  }
}

const descriptors = [
  ['accessToken', 'mercurion.v1.auth.access-token', 'local', ['accessToken'], textCodec, 'auth-session'],
  ['wsAccessToken', 'mercurion.v1.auth.ws-access-token', 'local', ['ws_accessToken'], textCodec, 'auth-session'],
  ['wsAccessTokenTimestamp', 'mercurion.v1.auth.ws-access-token-timestamp', 'local', ['ws_accessToken_ts'], numberCodec, 'auth-session'],
  ['login', 'mercurion.v1.auth.login-marker', 'local', ['login'], textCodec, 'auth-session'],
  ['scopes', 'mercurion.v1.auth.scopes', 'local', ['scp'], stringArrayCodec, 'auth-session'],
  ['wsScopes', 'mercurion.v1.auth.ws-scopes', 'local', ['ws_scp'], stringArrayCodec, 'auth-session'],
  ['wsRefreshLock', 'mercurion.v1.auth.ws-refresh-lock', 'local', ['ws_refresh_lock'], jsonCodec<{ owner: string; expiresAt: number }>(
    (value): value is { owner: string; expiresAt: number } => !!value && typeof value === 'object' && typeof (value as { owner?: unknown }).owner === 'string' &&
      Number.isFinite((value as { expiresAt?: unknown }).expiresAt)
  ), 'auth-session'],
  ['tabId', 'mercurion.v1.auth.tab-id', 'session', ['tab_id'], textCodec, 'auth-session'],
  ['preAuthorizationData', 'mercurion.v1.auth.pre-authorization', 'session', ['preAuthorizationData'], textCodec, 'pre-auth'],
  ['authRedirectIntent', 'mercurion.v1.auth.redirect-intent', 'session', ['authRedirectIntent'], textCodec, 'redirect'],
  ['mfaError', 'mercurion.v1.auth.mfa-error', 'session', ['mfaError'], textCodec, 'auth-session'],
  ['authError', 'mercurion.v1.auth.error', 'session', ['authError'], textCodec, 'auth-session'],
  ['theme', 'mercurion.v1.ui.theme', 'local', ['tw_theme'], themeCodec, 'theme'],
  ['routeError', 'mercurion.v1.ui.route-error', 'session', ['RouteError'], textCodec, 'header'],
  ['localDummyAuth', 'mercurion.v1.auth.local-dummy', 'local', [], textCodec, 'local-dummy']
] as const

export const STORAGE = Object.fromEntries(descriptors.map(([id, key]) => [id, key])) as {
  readonly [K in typeof descriptors[number][0]]: Extract<typeof descriptors[number], readonly [K, string, ...unknown[]]>[1]
}

const byKey = new Map<string, StorageDescriptor<unknown>>()
for (const [id, key, medium, legacyKeys, codec, owner] of descriptors) {
  const descriptor: StorageDescriptor<unknown> = {
    id, key, medium, legacyKeys, version: 1, owner, codec
  }
  byKey.set(key, descriptor)
  for (const legacyKey of legacyKeys) byKey.set(legacyKey, descriptor)
}

function storageFor(medium: StorageMedium): Storage | undefined {
  try {
    return medium === 'local' ? globalThis.localStorage : globalThis.sessionStorage
  } catch {
    return undefined
  }
}

@Injectable({ providedIn: 'root' })
export class BrowserStorageRegistry {
  get<T>(descriptor: StorageDescriptor<T>): T | null {
    const storage = storageFor(descriptor.medium)
    if (!storage) return null
    let raw: string | null = null
    try { raw = storage.getItem(descriptor.key) } catch { return null }
    let value = raw === null ? null : descriptor.codec.decode(raw)
    if (raw !== null && value === null) {
      this.remove(descriptor)
      return null
    }
    if (value !== null) return value
    for (const legacyKey of descriptor.legacyKeys) {
      try { raw = storage.getItem(legacyKey) } catch { raw = null }
      if (raw === null) continue
      value = descriptor.codec.decodeLegacy?.(raw) ?? null
      if (value !== null) {
        this.set(descriptor, value)
        try { storage.removeItem(legacyKey) } catch { /* fail closed */ }
      } else {
        try { storage.removeItem(legacyKey) } catch { /* fail closed */ }
      }
      return value
    }
    return null
  }

  set<T>(descriptor: StorageDescriptor<T>, value: T): void {
    try { storageFor(descriptor.medium)?.setItem(descriptor.key, descriptor.codec.encode(value)) } catch { /* fail closed */ }
  }

  remove<T>(descriptor: StorageDescriptor<T>): void {
    try {
      const storage = storageFor(descriptor.medium)
      storage?.removeItem(descriptor.key)
      for (const legacyKey of descriptor.legacyKeys) storage?.removeItem(legacyKey)
    } catch { /* fail closed */ }
  }

  event(event: StorageEvent): { descriptor: StorageDescriptor<unknown>; value: unknown | null } | null {
    if (!event.key || event.storageArea == null) return null
    const descriptor = byKey.get(event.key)
    if (!descriptor) return null
    const expected = storageFor(descriptor.medium)
    if (event.storageArea !== expected) return null
    const value = event.newValue === null ? null : descriptor.codec.decode(event.newValue)
    return { descriptor, value }
  }

  descriptorForKey(key: string): StorageDescriptor<unknown> | null {
    return byKey.get(key) ?? null
  }
}

export const storageDescriptors: readonly StorageDescriptor<unknown>[] =
  descriptors.map(([id, key, medium, legacyKeys, codec, owner]) => ({
    id, key, medium, legacyKeys, version: 1, owner, codec
  }))

export function storageDescriptor<T = unknown>(id: string): StorageDescriptor<T> {
  const descriptor = storageDescriptors.find(item => item.id === id)
  if (!descriptor) throw new Error(`Unknown browser storage descriptor: ${id}`)
  return descriptor as StorageDescriptor<T>
}
