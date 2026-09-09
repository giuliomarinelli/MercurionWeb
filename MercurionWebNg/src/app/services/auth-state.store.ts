import { computed, inject, Injectable, signal } from '@angular/core'
import { AuthSessionPersistenceService } from './auth-session-persistence.service'
import { AuthErrorService } from './auth-error.service'
import {
  INITIAL_SESSION_PROTOCOL,
  LOCAL_DUMMY_AUTH,
  SessionConnectionState,
  SessionInvalidationCause,
  SessionTransition,
  transitionSessionProtocol,
  type SessionInvalidationCauseType,
  type SessionProtocolSnapshot
} from '@mercurion/rest-contracts'

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
  | { kind: 'session-expired'; reason?: SessionInvalidationCauseType }
  | { kind: 'logging-out' }

export type AuthStateSnapshot = AuthState

export interface AuthCompletion {
  initials: string
  accessToken?: string | null
  wsAccessToken?: string | null
}

@Injectable({ providedIn: 'root' })
export class AuthStateStore {
  private readonly persistence = inject(AuthSessionPersistenceService)
  private readonly authErrors = inject(AuthErrorService)
  private readonly stateSignal = signal<AuthState>({ kind: 'bootstrap' })
  private readonly protocolSignal = signal<SessionProtocolSnapshot>(INITIAL_SESSION_PROTOCOL)
  private readonly expiryTick = signal(0)
  private expiryTimer?: ReturnType<typeof setTimeout>

  readonly state = this.stateSignal.asReadonly()
  /** Canonical validity/connection state shared with Nest. */
  readonly sessionProtocol = this.protocolSignal.asReadonly()
  readonly kind = computed(() => this.state().kind)
  /**
   * The only semantic authentication predicate exposed to Angular consumers.
   * Persistence markers are restore hints; only an authenticated state backed
   * by the canonical session protocol can satisfy this selector.
   */
  readonly authenticated = computed(() => {
    this.expiryTick()
    const state = this.state()
    return state.kind === 'authenticated' &&
      this.sessionProtocol().state === 'authenticated' &&
      !this.isExpired(state.accessToken)
  })
  /** Compatibility name for code that has not yet migrated to `authenticated`. */
  readonly isAuthenticated = this.authenticated
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
    if (hasPersistedSession) this.applyProtocol(SessionTransition.BeginAuthentication)
    return next
  }

  beginAuthentication(flow: 'password' | 'sso' | 'restore' = 'password'): void {
    this.assertAllowed(this.state().kind, 'authenticating')
    if (flow !== 'restore') {
      this.authErrors.beginAttempt()
      this.clearLocalDummyMarker()
      this.clearPersistence()
    }
    this.stateSignal.set({ kind: 'authenticating', flow })
    this.applyProtocol(SessionTransition.BeginAuthentication)
  }

  enterPreAuthentication(preAuthorizationToken?: string): void {
    this.assertAllowed(this.state().kind, 'pre-auth')
    this.clearClientCredentialsForPreAuth()
    this.stateSignal.set({ kind: 'pre-auth', preAuthorizationToken })
    if (this.sessionProtocol().state !== 'authenticating') {
      this.applyProtocol(SessionTransition.BeginAuthentication)
    }
  }

  completeAuthentication(completion: AuthCompletion): void {
    this.activateAuthenticatedSession(completion)
  }

  /**
   * Install the final server-accepted session.  This is the only normal
   * authentication completion boundary: scopes are always replaced from the
   * accepted access token, including when the token has no scp claim.
   */
  activateAuthenticatedSession(completion: AuthCompletion): void {
    this.authErrors.clear()
    const accessToken = completion.accessToken ?? null
    const wsAccessToken = completion.wsAccessToken ?? null
    const scopes = this.scopesFromAccessToken(accessToken)
    const currentKind = this.state().kind
    const hasServerAcceptedSession = Boolean(
      accessToken && wsAccessToken && this.hasClientLoginCookie()
    )
    const canRecoverLoginRace =
      (currentKind === 'anonymous' || currentKind === 'session-expired') &&
      hasServerAcceptedSession

    const next: AuthState = {
      kind: 'authenticated',
      initials: completion.initials,
      accessToken,
      wsAccessToken,
      scopes
    }
    if (!canRecoverLoginRace) this.assertAllowed(currentKind, next.kind)
    if (canRecoverLoginRace && this.sessionProtocol().state !== 'authenticating') {
      this.applyProtocol(SessionTransition.BeginAuthentication)
    }
    this.setAccessToken(accessToken)
    this.setWsAccessToken(wsAccessToken)
    this.setPersistedInitials(completion.initials)
    this.setCachedScopes(scopes)
    this.stateSignal.set(next)
    this.applyProtocol(SessionTransition.AuthenticationSucceeded)
    this.scheduleExpiry(accessToken)
  }

  updateAccessToken(token: string | null): void {
    const state = this.state()
    if (state.kind !== 'authenticated') return
    const scopes = this.scopesFromAccessToken(token)
    this.setAccessToken(token)
    this.setCachedScopes(scopes)
    this.transition({ ...state, accessToken: token, scopes })
    this.applyProtocol(SessionTransition.CredentialsRefreshed)
    this.scheduleExpiry(token)
  }

  updateWsAccessToken(token: string | null): void {
    const state = this.state()
    if (state.kind !== 'authenticated') return
    this.setWsAccessToken(token)
    this.transition({ ...state, wsAccessToken: token })
    this.applyProtocol(SessionTransition.CredentialsRefreshed)
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
    if (this.sessionProtocol().state !== 'authenticating') {
      this.applyProtocol(SessionTransition.BeginAuthentication)
    }
    this.setPersistedInitials(initials)
    this.stateSignal.set(next)
    this.applyProtocol(SessionTransition.AuthenticationSucceeded)
    this.scheduleExpiry(accessToken)
  }

  syncExternalState(): void {
    if (this.getPersistedInitials() || this.getWsAccessToken() || this.hasClientLoginCookie()) {
      this.transition({ kind: 'authenticating', flow: 'restore' })
      this.applyProtocol(SessionTransition.BeginAuthentication)
      return
    }
    this.clearPersistence()
    this.transition({ kind: 'anonymous' })
    this.applyProtocol(SessionTransition.Logout)
  }

  invalidate(reason: SessionInvalidationCauseType = SessionInvalidationCause.InvalidSession): void {
    this.clearExpiryTimer()
    this.clearLocalDummyMarker()
    this.clearPersistence()
    this.transition({ kind: 'session-expired', reason })
    this.applyProtocol(this.transitionForInvalidationCause(reason))
  }

  logout(): void {
    this.authErrors.clear()
    this.clearExpiryTimer()
    this.transition({ kind: 'logging-out' })
    this.clearLocalDummyMarker()
    this.clearPersistence()
    this.transition({ kind: 'anonymous' })
    this.applyProtocol(SessionTransition.Logout)
  }

  /**
   * Enter the recovery flow from a safe anonymous state.  The state transition
   * happens before persistence cleanup so guards and consumers cannot keep
   * observing an authenticated session while recovery invalidates credentials.
   */
  beginRecovery(): void {
    this.clearExpiryTimer()
    this.transition({ kind: 'anonymous' })
    this.clearLocalDummyMarker()
    this.persistence.clearAuthenticatedSession()
    this.persistence.clearPreAuthData()
    this.persistence.clearEphemeralAuthData()
    this.applyProtocol(SessionTransition.Logout)
  }

  requireReconnect(): void {
    this.applyProtocol(SessionTransition.ReconnectRequired)
  }

  setConnectionState(connection: SessionConnectionState): void {
    this.protocolSignal.update(snapshot => ({
      ...snapshot,
      connection,
      cause: connection === SessionConnectionState.Connected &&
        snapshot.cause === SessionInvalidationCause.ReconnectRequired
        ? undefined
        : snapshot.cause
    }))
  }

  getAccessToken(): string | null {
    return this.persistence.getAccessToken()
  }

  setAccessToken(token: string | null): void {
    this.persistence.setAccessToken(token)
  }

  getWsAccessToken(): string | null {
    return this.persistence.getWsAccessToken()
  }

  setWsAccessToken(token: string | null): void {
    this.persistence.setWsAccessToken(token)
  }

  getPersistedInitials(): string | null {
    return this.persistence.getInitials()
  }

  setPersistedInitials(initials: string): void {
    this.persistence.setInitials(initials)
  }

  getCachedScopes(): string[] | null {
    return this.persistence.getScopes()
  }

  setCachedScopes(scopes: string[] | null): void {
    this.persistence.setScopes(scopes)
  }

  clearPersistence(): void {
    this.persistence.clearAuthenticatedSession()
  }

  private clearClientCredentialsForPreAuth(): void {
    this.persistence.clearClientCredentialsForPreAuth()
  }

  private hasClientLoginCookie(): boolean {
    return this.persistence.hasLoginMarker()
  }

  private transition(next: AuthState): void {
    const current = this.state()
    this.assertAllowed(current.kind, next.kind)
    this.stateSignal.set(next)
  }

  private applyProtocol(transition: SessionTransition): void {
    this.protocolSignal.update(snapshot => transitionSessionProtocol(snapshot, transition))
  }

  private scheduleExpiry(token: string | null): void {
    this.clearExpiryTimer()
    const expiresAt = this.tokenExpiry(token)
    if (expiresAt === null) return
    const delay = Math.max(0, expiresAt - Date.now())
    this.expiryTimer = setTimeout(() => {
      this.expiryTick.update(value => value + 1)
      const state = this.state()
      if (state.kind === 'authenticated' && this.isExpired(state.accessToken)) {
        this.invalidate(SessionInvalidationCause.SessionExpired)
      }
    }, delay)
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== undefined) {
      clearTimeout(this.expiryTimer)
      this.expiryTimer = undefined
    }
  }

  private clearLocalDummyMarker(): void {
    try {
      localStorage.removeItem(LOCAL_DUMMY_AUTH.storageKey)
    } catch {
      // Storage failure is already a fail-closed inactive state.
    }
    if (typeof document !== 'undefined') {
      document.cookie = '__logged_in=; Max-Age=0; path=/'
      document.cookie = '__logged_in_=; Max-Age=0; path=/'
    }
  }

  private isExpired(token: string | null): boolean {
    const expiresAt = this.tokenExpiry(token)
    return expiresAt !== null && expiresAt <= Date.now()
  }

  private tokenExpiry(token: string | null): number | null {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null
    } catch {
      return null
    }
  }

  private scopesFromAccessToken(token: string | null): string[] {
    if (!token) return []
    const parts = token.split('.')
    if (parts.length !== 3) return []
    try {
      const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')))
      const claim = payload?.scp
      return typeof claim === 'string'
        ? claim.split(/\s+/).filter((scope: string) => scope.length > 0)
        : []
    } catch {
      return []
    }
  }

  private transitionForInvalidationCause(cause: SessionInvalidationCauseType): SessionTransition {
    switch (cause) {
      case SessionInvalidationCause.SessionExpired:
        return SessionTransition.SessionExpired
      case SessionInvalidationCause.SessionRevoked:
        return SessionTransition.SessionRevoked
      case SessionInvalidationCause.InvalidSignature:
        return SessionTransition.InvalidSignature
      case SessionInvalidationCause.InvalidCredentials:
        return SessionTransition.InvalidCredentials
      case SessionInvalidationCause.ReconnectRequired:
        return SessionTransition.ReconnectRequired
      case SessionInvalidationCause.InvalidSession:
        return SessionTransition.InvalidSession
    }
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
