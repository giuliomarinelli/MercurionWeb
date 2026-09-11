import { Injectable } from '@angular/core'
import { jwtDecode, type JwtPayload } from 'jwt-decode'
import { type Login_FirstStep_Data } from '../Models/confirm.models'
import { MfaStrategy } from '@mercurion/rest-contracts'
import { BrowserStorageRegistry, storageDescriptor } from './browser-storage-registry'
import {
  PRE_AUTH_STATE_KIND,
  PRE_AUTH_STATE_VERSION,
  type PersistedPreAuthState,
  type PreAuthReadResult
} from '../Models/auth/pre-auth.models'

export interface AuthSessionPersistencePort {
  getAccessToken(): string | null
  setAccessToken(value: string | null): void
  getWsAccessToken(): string | null
  setWsAccessToken(value: string | null): void
  getWsAccessTokenTimestamp(): number
  getInitials(): string | null
  setInitials(value: string): void
  getScopes(context?: 'http' | 'ws'): string[] | null
  setScopes(value: string[] | null, context?: 'http' | 'ws'): void
  commitAuthenticatedSession(value: { accessToken: string; wsAccessToken: string; initials: string; scopes: string[] }): void
  commitRotatedAccessToken(value: string, scopes: string[]): void
  getWsRefreshLock(): { owner: string; expiresAt: number } | null
  setWsRefreshLock(value: { owner: string; expiresAt: number }): void
  removeWsRefreshLock(): void
  getTabId(): string
  hasLoginMarker(): boolean
  getCookieValue(name: string): string | null
  removeLoginMarkers(): void
  getPreAuthorizationData(): string | null
  setPreAuthorizationData(value: string): void
  removePreAuthorizationData(): void
  savePreAuthState(data: Login_FirstStep_Data): boolean
  readPreAuthState(): PreAuthReadResult
  consumePreAuthState(): PreAuthReadResult
  getRedirectState(): string | null
  setRedirectState(value: string): void
  removeRedirectState(): void
  clearAuthenticatedSession(): void
  clearClientCredentialsForPreAuth(): void
  clearPreAuthData(): void
  clearEphemeralAuthData(): void
}

export class InMemoryAuthSessionPersistence implements AuthSessionPersistencePort {
  private readonly local = new Map<string, string>()
  private readonly session = new Map<string, string>()
  private readonly cookies = new Map<string, string>()
  private tabId?: string

  getAccessToken() { return this.local.get('accessToken') ?? null }
  setAccessToken(value: string | null) { this.set(this.local, 'accessToken', value) }
  getWsAccessToken() { return this.local.get('ws_accessToken') ?? null }
  setWsAccessToken(value: string | null) {
    this.set(this.local, 'ws_accessToken', value)
    if (value) this.local.set('ws_accessToken_ts', String(Date.now()))
    else this.local.delete('ws_accessToken_ts')
  }
  getWsAccessTokenTimestamp() { return Number(this.local.get('ws_accessToken_ts') ?? 0) }
  getInitials() { return this.local.get('login') ?? null }
  setInitials(value: string) { this.local.set('login', value) }
  getScopes(context: 'http' | 'ws' = 'http') { return this.decode(this.local.get(context === 'http' ? 'scp' : 'ws_scp'), context === 'http' ? 'scp' : 'ws_scp') }
  setScopes(value: string[] | null, context: 'http' | 'ws' = 'http') {
    const key = context === 'http' ? 'scp' : 'ws_scp'
    this.set(this.local, key, value === null ? null : this.encode(value))
  }
  commitAuthenticatedSession(value: { accessToken: string; wsAccessToken: string; initials: string; scopes: string[] }) {
    this.setAccessToken(value.accessToken)
    this.setWsAccessToken(value.wsAccessToken)
    this.setInitials(value.initials)
    this.setScopes(value.scopes)
  }
  commitRotatedAccessToken(value: string, scopes: string[]) {
    this.setAccessToken(value)
    this.setScopes(scopes)
  }
  getWsRefreshLock() { return this.decodeJson<{ owner: string; expiresAt: number }>(this.local.get('ws_refresh_lock'), 'ws_refresh_lock') }
  setWsRefreshLock(value: { owner: string; expiresAt: number }) { this.local.set('ws_refresh_lock', JSON.stringify(value)) }
  removeWsRefreshLock() { this.local.delete('ws_refresh_lock') }
  getTabId() { return this.tabId ??= this.session.get('tab_id') ?? this.newTabId() }
  hasLoginMarker() { return this.cookies.get('__logged_in') === 'true' || this.cookies.get('__logged_in_') === 'true' }
  getCookieValue(name: string) { return this.cookies.get(name) ?? null }
  removeLoginMarkers() { this.cookies.delete('__logged_in'); this.cookies.delete('__logged_in_') }
  getPreAuthorizationData() { return this.session.get('preAuthorizationData') ?? null }
  setPreAuthorizationData(value: string) { this.session.set('preAuthorizationData', value) }
  removePreAuthorizationData() { this.session.delete('preAuthorizationData') }
  savePreAuthState(data: Login_FirstStep_Data) {
    const state = buildPreAuthState(data)
    if (!state) { this.removePreAuthorizationData(); return false }
    this.setPreAuthorizationData(btoa(JSON.stringify(state)))
    return true
  }
  readPreAuthState() { return decodePreAuthState(this.getPreAuthorizationData(), () => this.removePreAuthorizationData()) }
  consumePreAuthState() {
    const result = this.readPreAuthState()
    this.removePreAuthorizationData()
    return result
  }
  getRedirectState() { return this.session.get('authRedirectIntent') ?? null }
  setRedirectState(value: string) { this.session.set('authRedirectIntent', value) }
  removeRedirectState() { this.session.delete('authRedirectIntent') }
  clearAuthenticatedSession() { for (const key of ['accessToken', 'ws_accessToken', 'ws_accessToken_ts', 'login', 'scp', 'ws_scp']) this.local.delete(key); this.removeLoginMarkers() }
  clearClientCredentialsForPreAuth() { for (const key of ['accessToken', 'ws_accessToken', 'ws_accessToken_ts', 'login', 'scp', 'ws_scp']) this.local.delete(key) }
  clearPreAuthData() { this.removePreAuthorizationData() }
  clearEphemeralAuthData() { this.removeWsRefreshLock(); this.session.delete('tab_id'); this.removeRedirectState(); this.session.delete('mfaError'); this.session.delete('authError') }
  private set(map: Map<string, string>, key: string, value: string | null) { if (value === null) map.delete(key); else map.set(key, value) }
  private encode(value: unknown) { return btoa(JSON.stringify(value)) }
  private decode(value: string | undefined, key: string) { if (!value) return null; try { const parsed = JSON.parse(atob(value)); return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : null } catch { this.local.delete(key); return null } }
  private decodeJson<T>(value: string | undefined, key: string) { if (!value) return null; try { const parsed = JSON.parse(value); return parsed && typeof parsed.owner === 'string' && Number.isFinite(parsed.expiresAt) ? parsed as T : null } catch { this.local.delete(key); return null } }
  private newTabId() { const id = Math.random().toString(36).slice(2); this.session.set('tab_id', id); return id }
}

@Injectable({ providedIn: 'root' })
export class AuthSessionPersistenceService implements AuthSessionPersistencePort {
  private readonly memory = new InMemoryAuthSessionPersistence()
  private get cookieString() { return typeof document === 'undefined' ? '' : document.cookie }
  constructor(private readonly registry: BrowserStorageRegistry = new BrowserStorageRegistry()) {}
  getAccessToken() { return this.registry.get(storageDescriptor<string>('accessToken')) }
  setAccessToken(value: string | null) { value ? this.registry.set(storageDescriptor<string>('accessToken'), value) : this.registry.remove(storageDescriptor<string>('accessToken')) }
  getWsAccessToken() { return this.registry.get(storageDescriptor<string>('wsAccessToken')) }
  setWsAccessToken(value: string | null) { if (value) { this.registry.set(storageDescriptor<string>('wsAccessToken'), value); this.registry.set(storageDescriptor<number>('wsAccessTokenTimestamp'), Date.now()) } else { this.registry.remove(storageDescriptor<string>('wsAccessToken')); this.registry.remove(storageDescriptor<number>('wsAccessTokenTimestamp')) } }
  getWsAccessTokenTimestamp() { return this.registry.get(storageDescriptor<number>('wsAccessTokenTimestamp')) ?? 0 }
  getInitials() { return this.registry.get(storageDescriptor<string>('login')) }
  setInitials(value: string) { this.registry.set(storageDescriptor<string>('login'), value) }
  getScopes(context: 'http' | 'ws' = 'http') { return this.registry.get(storageDescriptor<string[]>(context === 'http' ? 'scopes' : 'wsScopes')) }
  setScopes(value: string[] | null, context: 'http' | 'ws' = 'http') { const descriptor = storageDescriptor<string[]>(context === 'http' ? 'scopes' : 'wsScopes'); value === null ? this.registry.remove(descriptor) : this.registry.set(descriptor, value) }
  commitAuthenticatedSession(value: { accessToken: string; wsAccessToken: string; initials: string; scopes: string[] }) {
    this.setAccessToken(value.accessToken)
    this.setWsAccessToken(value.wsAccessToken)
    this.setInitials(value.initials)
    this.setScopes(value.scopes)
  }
  commitRotatedAccessToken(value: string, scopes: string[]) {
    this.setAccessToken(value)
    this.setScopes(scopes)
  }
  getWsRefreshLock() { return this.registry.get(storageDescriptor<{ owner: string; expiresAt: number }>('wsRefreshLock')) }
  setWsRefreshLock(value: { owner: string; expiresAt: number }) { this.registry.set(storageDescriptor('wsRefreshLock'), value) }
  removeWsRefreshLock() { this.registry.remove(storageDescriptor('wsRefreshLock')) }
  getTabId() { let id = this.registry.get(storageDescriptor<string>('tabId')); if (!id) { id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2); this.registry.set(storageDescriptor('tabId'), id) } return id }
  hasLoginMarker() { return this.getCookieValue('__logged_in') === 'true' || this.getCookieValue('__logged_in_') === 'true' }
  getCookieValue(name: string) { const cookie = this.cookieString.split('; ').find(value => value.startsWith(`${name}=`)); return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null }
  removeLoginMarkers() { for (const name of ['__logged_in', '__logged_in_']) if (typeof document !== 'undefined') document.cookie = `${name}=; Max-Age=0; path=/` }
  getPreAuthorizationData() { return this.registry.get(storageDescriptor<string>('preAuthorizationData')) }
  setPreAuthorizationData(value: string) { this.registry.set(storageDescriptor('preAuthorizationData'), value) }
  removePreAuthorizationData() { this.registry.remove(storageDescriptor('preAuthorizationData')) }
  savePreAuthState(data: Login_FirstStep_Data) {
    const state = buildPreAuthState(data)
    if (!state) { this.removePreAuthorizationData(); return false }
    this.setPreAuthorizationData(btoa(JSON.stringify(state)))
    return true
  }
  readPreAuthState() { return decodePreAuthState(this.getPreAuthorizationData(), () => this.removePreAuthorizationData()) }
  consumePreAuthState() {
    const result = this.readPreAuthState()
    this.removePreAuthorizationData()
    return result
  }
  getRedirectState() { return this.registry.get(storageDescriptor<string>('authRedirectIntent')) }
  setRedirectState(value: string) { this.registry.set(storageDescriptor('authRedirectIntent'), value) }
  removeRedirectState() { this.registry.remove(storageDescriptor('authRedirectIntent')) }
  clearAuthenticatedSession() { for (const key of ['accessToken', 'wsAccessToken', 'wsAccessTokenTimestamp', 'login', 'scopes', 'wsScopes']) this.registry.remove(storageDescriptor(key)); this.removeLoginMarkers() }
  clearClientCredentialsForPreAuth() { for (const key of ['accessToken', 'wsAccessToken', 'wsAccessTokenTimestamp', 'login', 'scopes', 'wsScopes']) this.registry.remove(storageDescriptor(key)) }
  clearPreAuthData() { this.removePreAuthorizationData() }
  clearEphemeralAuthData() {
    this.removeWsRefreshLock()
    this.registry.remove(storageDescriptor('tabId'))
    this.removeRedirectState()
    this.registry.remove(storageDescriptor('mfaError'))
    this.registry.remove(storageDescriptor('authError'))
  }
}

const supportedStrategies = new Set<string>(Object.values(MfaStrategy))

function buildPreAuthState(data: Login_FirstStep_Data): PersistedPreAuthState | null {
  const token = data.preAuthorizationToken
  if (typeof token !== 'string' || token.length === 0) return null
  if (!Array.isArray(data.enabledMfaStrategies) ||
    data.enabledMfaStrategies.length === 0 ||
    data.enabledMfaStrategies.some(strategy => typeof strategy !== 'string' || !supportedStrategies.has(strategy))) return null

  let claims: JwtPayload
  try {
    claims = jwtDecode<JwtPayload>(token)
  } catch {
    return null
  }
  const exp = claims.exp
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return null
  const expiresAt = exp * 1000
  if (expiresAt <= Date.now()) return null

  const optionalString = (value: unknown) => value === undefined ? undefined : typeof value === 'string' ? value : null
  const obscuredEmail = optionalString(data.obscuredEmail)
  const obscuredPhoneNumber = optionalString(data.obscuredPhoneNumber)
  if (obscuredEmail === null || obscuredPhoneNumber === null || typeof data.suspiciousAttempt !== 'boolean') return null

  return {
    version: PRE_AUTH_STATE_VERSION,
    kind: PRE_AUTH_STATE_KIND,
    preAuthorizationToken: token,
    expiresAt,
    enabledMfaStrategies: [...data.enabledMfaStrategies],
    suspiciousAttempt: data.suspiciousAttempt,
    ...(obscuredEmail === undefined ? {} : { obscuredEmail }),
    ...(obscuredPhoneNumber === undefined ? {} : { obscuredPhoneNumber })
  }
}

function decodePreAuthState(raw: string | null, remove: () => void): PreAuthReadResult {
  if (!raw) return { status: 'missing' }
  try {
    const decoded = JSON.parse(atob(raw)) as Partial<PersistedPreAuthState>
    if (decoded.version !== PRE_AUTH_STATE_VERSION ||
      decoded.kind !== PRE_AUTH_STATE_KIND ||
      typeof decoded.preAuthorizationToken !== 'string' ||
      !decoded.preAuthorizationToken ||
      typeof decoded.expiresAt !== 'number' ||
      !Number.isFinite(decoded.expiresAt) ||
      !Array.isArray(decoded.enabledMfaStrategies) ||
      decoded.enabledMfaStrategies.length === 0 ||
      decoded.enabledMfaStrategies.some(strategy => typeof strategy !== 'string' || !supportedStrategies.has(strategy)) ||
      typeof decoded.suspiciousAttempt !== 'boolean' ||
      (decoded.obscuredEmail !== undefined && typeof decoded.obscuredEmail !== 'string') ||
      (decoded.obscuredPhoneNumber !== undefined && typeof decoded.obscuredPhoneNumber !== 'string')) {
      remove()
      return { status: 'invalid' }
    }
    const expiresAt = decoded.expiresAt
    if (expiresAt <= Date.now()) {
      remove()
      return { status: 'expired' }
    }
    return { status: 'valid', state: decoded as PersistedPreAuthState }
  } catch {
    remove()
    return { status: 'invalid' }
  }
}
