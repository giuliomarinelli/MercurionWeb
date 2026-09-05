import { computed, Injectable, signal } from '@angular/core'

export type AuthState =
  | { kind: 'bootstrap' }
  | { kind: 'anonymous' }
  | { kind: 'authenticating'; flow: 'password' | 'sso' | 'restore' }
  | { kind: 'pre-auth'; preAuthorizationToken?: string }
  | {
    kind: 'authenticated'
    initials: string
    accessToken: string | null
    wsAccessToken: string | null
    scopes: string[]
  }
  | { kind: 'session-expired'; reason?: string }
  | { kind: 'logging-out' }

export type AuthStateSnapshot = AuthState

export interface AuthCompletion {
  initials: string
  accessToken?: string | null
  wsAccessToken?: string | null
  scopes?: string[]
}

@Injectable({ providedIn: 'root' })
export class AuthStateStore {
  private readonly stateSignal = signal<AuthState>({ kind: 'bootstrap' })

  readonly state = this.stateSignal.asReadonly()
  readonly kind = computed(() => this.state().kind)
  readonly isAuthenticated = computed(() => this.state().kind === 'authenticated')
  readonly isAnonymous = computed(() => this.state().kind === 'anonymous')
  readonly isAuthenticating = computed(() => this.state().kind === 'authenticating')
  readonly isPreAuth = computed(() => this.state().kind === 'pre-auth')
  readonly initials = computed(() => {
    const state = this.state()
    return state.kind === 'authenticated' ? state.initials : ''
  })

  bootstrap(): AuthStateSnapshot {
    const hasPersistedSession = Boolean(
      this.getAccessToken() ||
      this.getWsAccessToken() ||
      this.getPersistedInitials() ||
      this.hasClientLoginCookie()
    )
    const next: AuthState = hasPersistedSession
      ? { kind: 'authenticating', flow: 'restore' }
      : { kind: 'anonymous' }
    this.transition(next)
    return next
  }

  beginAuthentication(flow: 'password' | 'sso' | 'restore' = 'password'): void {
    this.assertAllowed(this.state().kind, 'authenticating')
    if (flow !== 'restore') this.clearPersistence()
    this.stateSignal.set({ kind: 'authenticating', flow })
  }

  enterPreAuthentication(preAuthorizationToken?: string): void {
    this.assertAllowed(this.state().kind, 'pre-auth')
    this.clearClientCredentialsForPreAuth()
    this.stateSignal.set({ kind: 'pre-auth', preAuthorizationToken })
  }

  completeAuthentication(completion: AuthCompletion): void {
    const accessToken = completion.accessToken ?? null
    const wsAccessToken = completion.wsAccessToken ?? null
    const scopes = completion.scopes ?? this.getCachedScopes() ?? []

    const next: AuthState = {
      kind: 'authenticated',
      initials: completion.initials,
      accessToken,
      wsAccessToken,
      scopes
    }
    this.assertAllowed(this.state().kind, next.kind)
    this.setAccessToken(accessToken)
    this.setWsAccessToken(wsAccessToken)
    this.setPersistedInitials(completion.initials)
    this.setCachedScopes(scopes)
    this.stateSignal.set(next)
  }

  updateAccessToken(token: string | null): void {
    const state = this.state()
    if (state.kind !== 'authenticated') return
    this.setAccessToken(token)
    this.transition({ ...state, accessToken: token })
  }

  updateWsAccessToken(token: string | null): void {
    const state = this.state()
    if (state.kind !== 'authenticated') return
    this.setWsAccessToken(token)
    this.transition({ ...state, wsAccessToken: token })
  }

  resumeFromServer(initials: string): void {
    if (this.state().kind === 'bootstrap') {
      this.transition({ kind: 'authenticating', flow: 'restore' })
    }
    const accessToken = this.getAccessToken()
    const wsAccessToken = this.getWsAccessToken()
    const next: AuthState = {
      kind: 'authenticated',
      initials,
      accessToken,
      wsAccessToken,
      scopes: this.getCachedScopes() ?? []
    }
    this.assertAllowed(this.state().kind, next.kind)
    this.setPersistedInitials(initials)
    this.stateSignal.set(next)
  }

  syncExternalState(): void {
    if (this.getPersistedInitials() || this.getWsAccessToken() || this.hasClientLoginCookie()) {
      this.transition({ kind: 'authenticating', flow: 'restore' })
      return
    }
    this.clearPersistence()
    this.transition({ kind: 'anonymous' })
  }

  invalidate(reason = 'server-invalidated'): void {
    this.clearPersistence()
    this.transition({ kind: 'session-expired', reason })
  }

  logout(): void {
    this.transition({ kind: 'logging-out' })
    this.clearPersistence()
    this.transition({ kind: 'anonymous' })
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken')
  }

  setAccessToken(token: string | null): void {
    if (token) localStorage.setItem('accessToken', token)
    else localStorage.removeItem('accessToken')
  }

  getWsAccessToken(): string | null {
    return localStorage.getItem('ws_accessToken')
  }

  setWsAccessToken(token: string | null): void {
    if (token) {
      localStorage.setItem('ws_accessToken', token)
      localStorage.setItem('ws_accessToken_ts', String(Date.now()))
    } else {
      localStorage.removeItem('ws_accessToken')
      localStorage.removeItem('ws_accessToken_ts')
    }
  }

  getPersistedInitials(): string | null {
    return localStorage.getItem('login')
  }

  setPersistedInitials(initials: string): void {
    localStorage.setItem('login', initials)
  }

  getCachedScopes(): string[] | null {
    const raw = localStorage.getItem('scp')
    if (!raw) return null
    try {
      return JSON.parse(atob(raw)) as string[]
    } catch {
      return null
    }
  }

  setCachedScopes(scopes: string[] | null): void {
    if (scopes === null) {
      localStorage.removeItem('scp')
      return
    }
    localStorage.setItem('scp', btoa(JSON.stringify(scopes)))
  }

  clearPersistence(): void {
    this.setAccessToken(null)
    this.setWsAccessToken(null)
    localStorage.removeItem('login')
    this.setCachedScopes(null)
    for (const name of ['__logged_in', '__logged_in_']) {
      document.cookie = `${name}=; Max-Age=0; path=/`
    }
  }

  private clearClientCredentialsForPreAuth(): void {
    this.setAccessToken(null)
    this.setWsAccessToken(null)
    localStorage.removeItem('login')
    this.setCachedScopes(null)
  }

  private hasClientLoginCookie(): boolean {
    return document.cookie.split('; ').some(cookie =>
      ['__logged_in=true', '__logged_in_=true'].includes(cookie)
    )
  }

  private transition(next: AuthState): void {
    const current = this.state()
    this.assertAllowed(current.kind, next.kind)
    this.stateSignal.set(next)
  }

  private assertAllowed(from: AuthState['kind'], to: AuthState['kind']): void {
    if (!this.isAllowed(from, to)) {
      throw new Error(`Illegal auth transition: ${from} -> ${to}`)
    }
  }

  private isAllowed(from: AuthState['kind'], to: AuthState['kind']): boolean {
    if (from === to) return true
    if (to === 'session-expired' || to === 'logging-out') return true
    if (from === 'logging-out') return to === 'anonymous'
    if (from === 'session-expired') return to === 'anonymous' || to === 'authenticating' || to === 'pre-auth'
    if (from === 'bootstrap') return to === 'anonymous' || to === 'authenticating' || to === 'pre-auth'
    if (from === 'anonymous') return to === 'authenticating' || to === 'pre-auth'
    if (from === 'authenticating') return to === 'authenticated' || to === 'pre-auth' || to === 'anonymous'
    if (from === 'pre-auth') return to === 'authenticated' || to === 'anonymous'
    if (from === 'authenticated') return to === 'authenticating' || to === 'pre-auth' || to === 'anonymous'
    return false
  }
}
