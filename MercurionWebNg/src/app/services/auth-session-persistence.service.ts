import { Injectable } from '@angular/core'

export interface AuthSessionPersistencePort {
  getAccessToken(): string | null
  setAccessToken(value: string | null): void
  getWsAccessToken(): string | null
  setWsAccessToken(value: string | null): void
  getInitials(): string | null
  setInitials(value: string): void
  getScopes(context?: 'http' | 'ws'): string[] | null
  setScopes(value: string[] | null, context?: 'http' | 'ws'): void
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
  getRedirectState(): string | null
  setRedirectState(value: string): void
  removeRedirectState(): void
  setTransientAuthError(value: string): void
  removeTransientAuthError(): void
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
  getInitials() { return this.local.get('login') ?? null }
  setInitials(value: string) { this.local.set('login', value) }
  getScopes(context: 'http' | 'ws' = 'http') { return this.decode(this.local.get(context === 'http' ? 'scp' : 'ws_scp'), context === 'http' ? 'scp' : 'ws_scp') }
  setScopes(value: string[] | null, context: 'http' | 'ws' = 'http') {
    const key = context === 'http' ? 'scp' : 'ws_scp'
    this.set(this.local, key, value === null ? null : this.encode(value))
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
  getRedirectState() { return this.session.get('redirectAfterLogin') ?? null }
  setRedirectState(value: string) { this.session.set('redirectAfterLogin', value) }
  removeRedirectState() { this.session.delete('redirectAfterLogin') }
  setTransientAuthError(value: string) { this.session.set('mfaError', value) }
  removeTransientAuthError() { this.session.delete('mfaError') }
  clearAuthenticatedSession() { for (const key of ['accessToken', 'ws_accessToken', 'ws_accessToken_ts', 'login', 'scp', 'ws_scp']) this.local.delete(key); this.removeLoginMarkers() }
  clearClientCredentialsForPreAuth() { for (const key of ['accessToken', 'ws_accessToken', 'ws_accessToken_ts', 'login', 'scp', 'ws_scp']) this.local.delete(key) }
  clearPreAuthData() { this.removePreAuthorizationData() }
  clearEphemeralAuthData() { this.removeWsRefreshLock(); this.session.delete('tab_id'); this.removeRedirectState(); this.removeTransientAuthError() }
  private set(map: Map<string, string>, key: string, value: string | null) { if (value === null) map.delete(key); else map.set(key, value) }
  private encode(value: unknown) { return btoa(JSON.stringify(value)) }
  private decode(value: string | undefined, key: string) { if (!value) return null; try { const parsed = JSON.parse(atob(value)); return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : null } catch { this.local.delete(key); return null } }
  private decodeJson<T>(value: string | undefined, key: string) { if (!value) return null; try { const parsed = JSON.parse(value); return parsed && typeof parsed.owner === 'string' && Number.isFinite(parsed.expiresAt) ? parsed as T : null } catch { this.local.delete(key); return null } }
  private newTabId() { const id = Math.random().toString(36).slice(2); this.session.set('tab_id', id); return id }
}

@Injectable({ providedIn: 'root' })
export class AuthSessionPersistenceService implements AuthSessionPersistencePort {
  private readonly memory = new InMemoryAuthSessionPersistence()
  private get local(): Storage | undefined { return typeof localStorage === 'undefined' ? undefined : localStorage }
  private get session(): Storage | undefined { return typeof sessionStorage === 'undefined' ? undefined : sessionStorage }
  private get cookieString() { return typeof document === 'undefined' ? '' : document.cookie }
  private getItem(storage: Storage | undefined, key: string) { try { return storage?.getItem(key) ?? null } catch { return null } }
  private setItem(storage: Storage | undefined, key: string, value: string) { try { storage?.setItem(key, value) } catch { /* fail closed */ } }
  private removeItem(storage: Storage | undefined, key: string) { try { storage?.removeItem(key) } catch { /* fail closed */ } }
  getAccessToken() { return this.getItem(this.local, 'accessToken') }
  setAccessToken(value: string | null) { value ? this.setItem(this.local, 'accessToken', value) : this.removeItem(this.local, 'accessToken') }
  getWsAccessToken() { return this.getItem(this.local, 'ws_accessToken') }
  setWsAccessToken(value: string | null) { if (value) { this.setItem(this.local, 'ws_accessToken', value); this.setItem(this.local, 'ws_accessToken_ts', String(Date.now())) } else { this.removeItem(this.local, 'ws_accessToken'); this.removeItem(this.local, 'ws_accessToken_ts') } }
  getInitials() { return this.getItem(this.local, 'login') }
  setInitials(value: string) { this.setItem(this.local, 'login', value) }
  getScopes(context: 'http' | 'ws' = 'http') { const key = context === 'http' ? 'scp' : 'ws_scp'; const raw = this.getItem(this.local, key); if (!raw) return null; try { const value = JSON.parse(atob(raw)); if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error('invalid scopes'); return value as string[] } catch { this.removeItem(this.local, key); return null } }
  setScopes(value: string[] | null, context: 'http' | 'ws' = 'http') { const key = context === 'http' ? 'scp' : 'ws_scp'; value === null ? this.removeItem(this.local, key) : this.setItem(this.local, key, btoa(JSON.stringify(value))) }
  getWsRefreshLock() { const raw = this.getItem(this.local, 'ws_refresh_lock'); if (!raw) return null; try { const value = JSON.parse(raw); if (typeof value.owner !== 'string' || !Number.isFinite(value.expiresAt)) throw new Error('invalid lock'); return value as { owner: string; expiresAt: number } } catch { this.removeWsRefreshLock(); return null } }
  setWsRefreshLock(value: { owner: string; expiresAt: number }) { this.setItem(this.local, 'ws_refresh_lock', JSON.stringify(value)) }
  removeWsRefreshLock() { this.removeItem(this.local, 'ws_refresh_lock') }
  getTabId() { let id = this.getItem(this.session, 'tab_id'); if (!id) { id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2); this.setItem(this.session, 'tab_id', id) } return id }
  hasLoginMarker() { return this.getCookieValue('__logged_in') === 'true' || this.getCookieValue('__logged_in_') === 'true' }
  getCookieValue(name: string) { const cookie = this.cookieString.split('; ').find(value => value.startsWith(`${name}=`)); return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null }
  removeLoginMarkers() { for (const name of ['__logged_in', '__logged_in_']) if (typeof document !== 'undefined') document.cookie = `${name}=; Max-Age=0; path=/` }
  getPreAuthorizationData() { return this.getItem(this.session, 'preAuthorizationData') }
  setPreAuthorizationData(value: string) { this.setItem(this.session, 'preAuthorizationData', value) }
  removePreAuthorizationData() { this.removeItem(this.session, 'preAuthorizationData') }
  getRedirectState() { return this.getItem(this.session, 'redirectAfterLogin') }
  setRedirectState(value: string) { this.setItem(this.session, 'redirectAfterLogin', value) }
  removeRedirectState() { this.removeItem(this.session, 'redirectAfterLogin') }
  setTransientAuthError(value: string) { this.setItem(this.session, 'mfaError', value) }
  removeTransientAuthError() { this.removeItem(this.session, 'mfaError') }
  clearAuthenticatedSession() { for (const key of ['accessToken', 'ws_accessToken', 'ws_accessToken_ts', 'login', 'scp', 'ws_scp']) this.removeItem(this.local, key); this.removeLoginMarkers() }
  clearClientCredentialsForPreAuth() { for (const key of ['accessToken', 'ws_accessToken', 'ws_accessToken_ts', 'login', 'scp', 'ws_scp']) this.removeItem(this.local, key) }
  clearPreAuthData() { this.removePreAuthorizationData() }
  clearEphemeralAuthData() { this.removeWsRefreshLock(); this.removeItem(this.session, 'tab_id'); this.removeRedirectState(); this.removeTransientAuthError() }
}
