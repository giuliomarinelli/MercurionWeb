import { computed, Injectable, signal } from '@angular/core'

export type AuthState =
  | { kind: 'bootstrap' }
  | { kind: 'anonymous' }
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
    const next: AuthState = hasPersistedSession ? { kind: 'pre-auth' } : { kind: 'anonymous' }
    this.transition(next)
    return next
  }

  beginAuthentication(preAuthorizationToken?: string): void {
    this.transition({ kind: 'pre-auth', preAuthorizationToken })
  }

  completeAuthentication(completion: AuthCompletion): void {
    const accessToken = completion.accessToken ?? null
    const wsAccessToken = completion.wsAccessToken ?? null
    const scopes = completion.scopes ?? this.getCachedScopes() ?? []

    this.setAccessToken(accessToken)
    this.setWsAccessToken(wsAccessToken)
    this.setPersistedInitials(completion.initials)
    this.setCachedScopes(scopes)
    this.transition({
      kind: 'authenticated',
      initials: completion.initials,
      accessToken,
      wsAccessToken,
      scopes
    })
  }

  updateAccessToken(token: string | null): void {
    this.setAccessToken(token)
    const state = this.state()
    if (state.kind === 'authenticated') {
      this.transition({ ...state, accessToken: token })
    }
  }

  updateWsAccessToken(token: string | null): void {
    this.setWsAccessToken(token)
    const state = this.state()
    if (state.kind === 'authenticated') {
      this.transition({ ...state, wsAccessToken: token })
    }
  }

  resumeFromServer(initials: string): void {
    if (this.state().kind === 'bootstrap') {
      this.transition({ kind: 'pre-auth' })
    }
    const accessToken = this.getAccessToken()
    const wsAccessToken = this.getWsAccessToken()
    this.setPersistedInitials(initials)
    this.transition({
      kind: 'authenticated',
      initials,
      accessToken,
      wsAccessToken,
      scopes: this.getCachedScopes() ?? []
    })
  }

  syncExternalState(): void {
    if (this.getPersistedInitials() || this.getWsAccessToken() || this.hasClientLoginCookie()) {
      this.transition({ kind: 'pre-auth' })
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

  private hasClientLoginCookie(): boolean {
    return document.cookie.split('; ').some(cookie =>
      ['__logged_in=true', '__logged_in_=true'].includes(cookie)
    )
  }

  private transition(next: AuthState): void {
    const current = this.state()
    if (!this.isAllowed(current.kind, next.kind)) {
      throw new Error(`Illegal auth transition: ${current.kind} -> ${next.kind}`)
    }
    this.stateSignal.set(next)
  }

  private isAllowed(from: AuthState['kind'], to: AuthState['kind']): boolean {
    if (from === to) return true
    if (to === 'session-expired' || to === 'logging-out') return true
    if (from === 'logging-out') return to === 'anonymous'
    if (from === 'session-expired') return to === 'anonymous' || to === 'pre-auth'
    if (from === 'bootstrap') return to === 'anonymous' || to === 'pre-auth'
    if (from === 'anonymous') return to === 'pre-auth' || to === 'authenticated'
    if (from === 'pre-auth') return to === 'authenticated' || to === 'anonymous'
    if (from === 'authenticated') return to === 'pre-auth' || to === 'anonymous'
    return false
  }
}
