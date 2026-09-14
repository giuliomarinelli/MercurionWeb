import { Injectable, inject } from '@angular/core'
import { JwtHelperService } from './jwt-helper.service'
import { AuthStateStore } from './auth-state.store'
import { AuthSessionPersistenceService } from './auth-session-persistence.service'
import { BrowserStorageRegistry } from './browser-storage-registry'

export type TokenType = 'access_token' | 'ws_accessToken'

/** Owns client session reads, persistence and the cross-tab refresh lease. */
@Injectable({ providedIn: 'root' })
export class AuthSessionRepository {
  private readonly jwt = inject(JwtHelperService)
  private readonly state = inject(AuthStateStore)
  private readonly persistence = inject(AuthSessionPersistenceService)
  private readonly storage = inject(BrowserStorageRegistry)
  private readonly lockTtlMs = 5000

  constructor() {
    this.persistence.getTabId()
  }

  getCookieValue(key: string): string | null { return this.persistence.getCookieValue(key) }
  getAccessToken(): string | null { return this.state.getAccessToken() }
  getWsAccessToken(): string | null { return this.state.getWsAccessToken() }
  getLoggedUserId(): string | null {
    const token = this.getAccessToken()
    return token ? this.jwt.getClaim<string>(token, 'sub') : null
  }
  isWsTokenExpired(token = this.getWsAccessToken()): boolean {
    return !token || this.jwt.isTokenExpired(token)
  }
  getWsTokenTtlSeconds(token = this.getWsAccessToken()): number | null {
    if (!token) return null
    const iat = this.jwt.getClaim<number>(token, 'iat')
    const exp = this.jwt.getClaim<number>(token, 'exp')
    if (typeof iat !== 'number' || typeof exp !== 'number') return null
    const ttl = exp - iat
    return Number.isFinite(ttl) ? ttl : null
  }
  getUserScopesFromClaims(token = this.getAccessToken(), cache = false): string[] {
    const scopes = token ? this.jwt.getClaim<string>(token, 'scp')?.split(/\s+/).filter(Boolean) ?? [] : []
    if (cache) this.setCachedScopes(scopes)
    return scopes
  }
  setCachedScopes(scopes: string[] | null, context: TokenType = 'access_token'): void {
    if (context === 'access_token') this.state.setCachedScopes(scopes)
    else this.persistence.setScopes(scopes, 'ws')
  }
  getCachedScopes(context: TokenType = 'access_token'): string[] | null {
    return context === 'access_token' ? this.state.getCachedScopes() : this.persistence.getScopes('ws')
  }
  clearCachedScopes(context: TokenType): void { this.setCachedScopes(null, context) }

  clientSessionId(): string | undefined { return this.state.clientSession()?.sessionId }
  logout(): void { this.state.logout() }
  activate(session: { initials: string; accessToken: string; wsAccessToken: string }): void {
    this.state.activateAuthenticatedSession(session)
  }
  beginAuthentication(kind: 'password' | 'sso' = 'password'): void { this.state.beginAuthentication(kind) }
  enterPreAuthentication(token: string): void { this.state.enterPreAuthentication(token) }
  invalidate(): void { this.state.invalidate() }
  stateKind(): string { return this.state.state().kind }
  rotateWsAccessToken(token: string, sessionId: string): void { this.state.rotateWsAccessToken(token, sessionId) }
  savePreAuthState(value: Parameters<AuthSessionPersistenceService['savePreAuthState']>[0]): boolean {
    return this.persistence.savePreAuthState(value)
  }
  removeRefreshLock(): void { this.persistence.removeWsRefreshLock() }

  tryAcquireRefreshLock(): boolean {
    const current = this.persistence.getWsRefreshLock()
    if (current && current.expiresAt > Date.now() && current.owner !== this.tabId) return false
    this.persistence.setWsRefreshLock({ owner: this.tabId, expiresAt: Date.now() + this.lockTtlMs })
    const confirmed = this.persistence.getWsRefreshLock()
    return confirmed?.owner === this.tabId
  }
  releaseRefreshLock(): void {
    const current = this.persistence.getWsRefreshLock()
    if (current?.owner === this.tabId) this.persistence.removeWsRefreshLock()
  }
  waitForRefreshChange(timeoutMs: number): Promise<void> {
    if (timeoutMs <= 0) return Promise.resolve()
    const start = Date.now()
    const initial = this.getWsAccessToken()
    let changed = false
    const onStorage = (event: StorageEvent) => {
      const change = this.storage.event(event)
      changed = change?.descriptor.id === 'wsAccessToken' || change?.descriptor.id === 'wsRefreshLock'
    }
    window.addEventListener('storage', onStorage)
    return (async () => {
      try {
        while (!changed && Date.now() - start < timeoutMs) {
          if (this.getWsAccessToken() && this.getWsAccessToken() !== initial) return
          const lock = this.persistence.getWsRefreshLock()
          if (!lock || lock.expiresAt <= Date.now()) return
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      } finally {
        window.removeEventListener('storage', onStorage)
      }
    })()
  }

  private get tabId(): string { return this.persistence.getTabId() }
}
