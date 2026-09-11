/* ──────────────────────────────────────────────────────────────
 * SessionSyncService – sync login <-> WS con cookie guard
 * Regole:
 *  - "LoggedIn" ⇢ userCtx.initials !== '' **E** cookie (__logged_in | __logged_in_) === 'true'
 *  - PUBLIC: WS attiva ma senza handshake session_init
 *  - PRIVATE: handshake so.pub.session_init → ACK ⇒ mantieni PRIVATE
 *  - No ACK in PRIVATE: degrada a anonimo/public
 *  - Niente autologout da `storage` se il cookie è presente
 * ────────────────────────────────────────────────────────────── */
import { DestroyRef, effect, inject, Injectable, NgZone, OnDestroy, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Subscription } from 'rxjs'
import { Router } from '@angular/router'
import { AuthStateStore } from './auth-state.store'
import { AuthSessionPersistenceService } from './auth-session-persistence.service'
import { AuthRedirectService } from './auth-redirect.service'
import { ToastService } from './toast.service'
import { RealtimeSocketService } from './socket.IO/realtime-socket.service'
import { activeRoutePolicy } from '../route-policy'
import {
  ApplicationErrorCode,
  hasApplicationErrorCode
} from '../utils/application-error.util'
import {
  SessionConnectionState,
  SessionInvalidationCause,
  type SessionInvalidationCauseType
} from '@mercurion/rest-contracts'
import { ToastVariant } from '../Models/toast.models'
import { BrowserStorageRegistry } from './browser-storage-registry'

/**
 * Storage is the single cross-tab transport for auth state.  The websocket
 * token is deliberately classified separately: it is a credential refresh
 * hint for RealtimeSocketService, not an authentication transition.
 */
export type CrossTabAuthStorageEvent =
  | { kind: 'session-changed'; key: 'login'; authenticated: boolean }
  | { kind: 'ws-credential-changed'; key: 'ws_accessToken' }

export function classifyCrossTabAuthStorageEvent(event: StorageEvent, registry?: BrowserStorageRegistry): CrossTabAuthStorageEvent | null {
  const descriptor = registry?.event(event)
  if (descriptor && descriptor.descriptor.owner !== 'auth-session') return null
  const localStorageArea = globalThis['localStorage'] as Storage | undefined
  if (event.storageArea === null || (!descriptor && event.storageArea !== localStorageArea)) return null
  if (event.key === 'login' || descriptor?.descriptor.id === 'login') {
    return { kind: 'session-changed', key: 'login', authenticated: event.newValue !== null }
  }
  if (event.key === 'ws_accessToken' || descriptor?.descriptor.id === 'wsAccessToken') {
    return { kind: 'ws-credential-changed', key: 'ws_accessToken' }
  }
  return null
}

export type SessionSyncStatus =
  | 'unknown'
  | 'checking'
  | 'loggedIn'
  | 'anonymous'
  | 'sessionExpired'
  | 'disconnected'
  | 'error'

@Injectable({ providedIn: 'root' })
export class SessionSyncService implements OnDestroy {

  private readonly socket = inject(RealtimeSocketService)
  private readonly authState = inject(AuthStateStore)
  private readonly persistence = inject(AuthSessionPersistenceService)
  private readonly redirects = inject(AuthRedirectService)
  private readonly toast = inject(ToastService)
  private readonly router = inject(Router)
  private readonly zone = inject(NgZone)
  private readonly storageRegistry = inject(BrowserStorageRegistry)
  private readonly destroyRef = inject(DestroyRef)
  private readonly realtimeSubscriptions = new Subscription()




  private _handshakeTick = signal<number>(0)
  public readonly handshakeTick = this._handshakeTick.asReadonly()

  private _voluntaryLogoutTick = signal<number>(0)
  readonly voluntaryLogoutTick = this._voluntaryLogoutTick.asReadonly()

  private _status = signal<SessionSyncStatus>('unknown')
  public readonly status = this._status.asReadonly()

  private handshakePending = false

  private lastAnonHS = 0
  private readonly anonCooldown = 5_000

  /** True dopo il primo ACK positivo in questa pagina. */
  private verifiedOnce = false

  private toastMuteTimer!: ReturnType<typeof setTimeout>
  private toastMutedUntil = 0
  private readonly voluntaryLogoutToastSilenceMs = 3000
  private lastVoluntaryLogoutAt = 0
  private readonly voluntaryLogoutGraceMs = 12_000

  constructor() {

    effect(() => {
      const t = this._voluntaryLogoutTick()
      if (t === 0) {
        return
      }
      this.startToastMuteWindow()
    })

    // eventi WS
    // These are application-lifetime subscriptions owned by this service.
    // Angular teardown removes only these subscriptions, never socket peers.
    this.realtimeSubscriptions.add(this.socket.onConnect().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() =>
      this.zone.run(() => {
        this.authState.setConnectionState(SessionConnectionState.Connected)
        void this.syncSession()
      })
    ))

    this.realtimeSubscriptions.add(this.socket.onDisconnect().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => {
      if (r !== 'io client disconnect') {
        this.authState.requireReconnect()
        this._status.set('disconnected')
      }
    }))

    // errore applicativo → tentiamo resync (niente logout automatico)
    this.realtimeSubscriptions.add(this.socket.onApplicationError().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(err =>
      this.zone.run(() => {
        if (hasApplicationErrorCode(
          err,
          ApplicationErrorCode.AUTHENTICATION_UNAUTHORIZED
        )) {
          void this.handleUnauthorized()
        }
      })
    ))

    // scadenza sessione lato server
    this.realtimeSubscriptions.add(this.socket.onSessionExpired().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(payload =>
      this.zone.run(() => this.handleSessionExpired(payload.cause))
    ))

    // bootstrap: parte PUBLIC, poi decide se uppare a PRIVATE
    this.socket.connect()
    void this.syncSession()

    window.addEventListener('storage', this.onStorage)
  }

  private storageDebounce?: ReturnType<typeof setTimeout>

  private readonly onStorage = (event: StorageEvent): void => {
    const change = classifyCrossTabAuthStorageEvent(event, this.storageRegistry)
    if (!change) return

    clearTimeout(this.storageDebounce)
    this.storageDebounce = setTimeout(() => {
      if (change.kind === 'ws-credential-changed') {
        // RealtimeSocketService owns this credential hint.  Do not run the
        // session handshake here: doing so turns token refresh into an
        // artificial login/logout transition.
        return
      }

      if (change.authenticated) {
        // `login` is only a restore hint.  The following websocket handshake
        // validates the server session before the store becomes authenticated.
        this.onExternalLogin()
        return
      }

      // A removed marker is not by itself proof that the server cookie was
      // cleared.  Wait for the cookie guard before applying anonymous state.
      if (!this.hasClientLoginCookieTrue()) this.onExternalLogout()
    }, 30)
  }

  ngOnDestroy(): void {
    this.realtimeSubscriptions.unsubscribe()
    clearTimeout(this.storageDebounce)
    window.removeEventListener('storage', this.onStorage)
    clearTimeout(this.toastMuteTimer)
  }

  notifyVoluntaryLogout(): void {
    this.lastVoluntaryLogoutAt = Date.now()
    this.startToastMuteWindow()
    this._voluntaryLogoutTick.update((x) => x + 1)
  }

  /* ---------------- Public API ---------------- */

  resumeSession(initials: string) {
    this.onExternalLogin(initials)
    this._handshakeTick.update(x => x + 1)
  }

  requestHandshake() {
    this._handshakeTick.update(x => x + 1)
  }

  forceSessionCheck() {
    void this.syncSession(true)
  }

  logout() {
    queueMicrotask(() => {
      this.completeVoluntaryLogout()
    })
  }

  /** Finish navigation/realtime downgrade after AuthService owns the command. */
  completeVoluntaryLogout(): void {
    this._status.set('anonymous')
    void this.socket.reconnectPublicNow()
    if (!this.isPublicRoute(this.router.url)) {
      this.redirectToLoginWithRedirectTo()
    }
  }

  get currentStatus() {
    return this._status()
  }

  /* ---------------- Handshake core ---------------- */

  async syncSession(force = false): Promise<void> {
    // se siamo già privati e marcati loggedIn, evita rumore
    if (!force && this._status() === 'loggedIn' && this.socket.getMode() === 'private') return

    if (this.handshakePending) return

    const now = Date.now()
    const initials = this.authState.getPersistedInitials() ?? ''
    const cookieLogged = this.hasClientLoginCookieTrue()

    // login locale senza cookie → stato inconsistente: considera la sessione scaduta
    if (initials && !cookieLogged) {
      this.handleSessionExpired(SessionInvalidationCause.InvalidSession)
      return
    }

    // Regola: senza cookie NON consideriamo loggati → targetIsPrivate = false
    const targetIsPrivate = cookieLogged && initials !== ''

    // cooldown se anon
    if (!targetIsPrivate && !force && now - this.lastAnonHS < this.anonCooldown) {
      if (this._status() !== 'anonymous') this._status.set('anonymous')
      return
    }

    this.handshakePending = true
    this._status.set('checking')

    try {
      if (targetIsPrivate) await this.socket.ensurePrivate()
      else await this.socket.ensurePublic()

      const connected = await this.socket.waitConnected(4000)
      if (!connected) {
        this._status.set(targetIsPrivate ? 'disconnected' : 'anonymous')
        if (!targetIsPrivate) this.lastAnonHS = now
        return
      }

      await this.socket.waitStable()

      // 🔹 Caso PUBLIC: WS attiva per eventi pubblici, ma niente handshake session_init
      if (!targetIsPrivate) {
        this._status.set('anonymous')
        this.lastAnonHS = now
        return
      }

      // 🔹 Caso PRIVATE: facciamo l’handshake forte via so.pub.session_init
      await this.completePrivateHandshake()
    } catch {
      this._status.set(targetIsPrivate ? 'disconnected' : 'error')
    } finally {
      this.handshakePending = false
    }
  }

  private async completePrivateHandshake(): Promise<void> {
    const ack = await this.socket.emitSessionInit(1200)
    if (ack?.detail !== 'websocket session init successful') {
      this._status.set('disconnected')
      return
    }

    const initials = this.authState.getPersistedInitials() ?? 'U'
    this.authState.resumeFromServer(initials)

    if (!this.hasClientLoginCookieTrue()) {
      this._status.set('anonymous')
      this.lastAnonHS = Date.now()
      await this.socket.ensurePublic()
      return
    }

    this.verifiedOnce = true
    this._status.set('loggedIn')
  }

  /* ---------------- Eventi server ---------------- */

  private async handleUnauthorized(): Promise<void> {
    const initials = this.authState.getPersistedInitials() ?? ''
    const cookieLogged = this.hasClientLoginCookieTrue()

    // Se non risultiamo loggati, non tentiamo nemmeno il private
    if (!initials || !cookieLogged) {
      this._status.set('anonymous')
      this.lastAnonHS = Date.now()
      return
    }

    // The realtime owner bounds transport retries.  This coordinator requests
    // one current-session refresh and lets the owner expose degradation.
    await this.socket.ensurePrivate(undefined, { forceRefresh: true })
    // 2) Re-run the single handshake against the current session.
    await this.syncSession(true)
  }

  private handleSessionExpired(
    cause: SessionInvalidationCauseType = SessionInvalidationCause.InvalidSession
  ): void {
    const voluntary = this.isVoluntaryLogoutRecent()
    // evento di scadenza lato server → consideralo definitivo anche se il cookie esiste ancora
    const alreadyExpired = this._status() === 'sessionExpired'
    this.authState.invalidate(cause)
    const muted = voluntary || alreadyExpired || Date.now() < this.toastMutedUntil
    this._status.set(voluntary ? 'anonymous' : 'sessionExpired')
    this.becomeAnonymous({
      toast: muted ? undefined : 'Sessione scaduta o invalidata. Effettua di nuovo il login.',
      level: 'error',
      navigateIfProtected: true,
      removeLoginKey: false
    })
  }

  /* ---------------- Cross-tab helpers ---------------- */

  private onExternalLogin(initials?: string) {
    const kind = this.authState.state().kind
    // A storage event queued before voluntary logout must not resurrect the
    // private session.  A real subsequent login enters `authenticating`
    // first, so it is still allowed through this guard.
    if (kind === 'anonymous' && this.isVoluntaryLogoutRecent()) return
    if (kind === 'anonymous' || kind === 'bootstrap' || kind === 'session-expired') {
      this.authState.beginAuthentication('restore')
    }
    if (initials) this.authState.setPersistedInitials(initials)
    this._status.set('checking')
    void this.syncSession(true)
  }

  private onExternalLogout() {
    if (this._status() === 'anonymous' && this.authState.state().kind === 'anonymous') return
    this.becomeAnonymous({
      toast: 'Logout da un’altra scheda.',
      level: 'success',
      navigateIfProtected: true,
      removeLoginKey: false
    })
  }

  /* ---------------- Helper ---------------- */

  /** true se esiste __logged_in o __logged_in_ con valore 'true' (non httpOnly). */
  private hasClientLoginCookieTrue(): boolean {
    const v1 = this.readCookie('__logged_in')
    const v2 = this.readCookie('__logged_in_')
    return v1 === 'true' || v2 === 'true'
  }

  private readCookie(name: string): string | null { return this.persistence.getCookieValue(name) }

  private becomeAnonymous(
    opts: {
      toast?: string
      level?: ToastVariant
      navigateIfProtected?: boolean
      /** se true rimuove anche la chiave 'login' */
      removeLoginKey?: boolean
    } = {}
  ) {
    const { toast, level = 'warn', navigateIfProtected } = opts

    this.authState.logout()
    this._status.set('anonymous')

    // Ripristina SUBITO la WS pubblica (senza reload) per eventi pubblici
    void this.socket.reconnectPublicNow()

    if (toast) this.triggerToast(toast, level)

    if (navigateIfProtected && !this.isPublicRoute(this.router.url)) {
      this.redirectToLoginWithRedirectTo()
    }
  }

  private redirectToLoginWithRedirectTo(): void {
    const target = this.redirects.capture(this.router.url)
    void this.router.navigate(['/login'], {
      queryParams: target ? { redirect_to: target } : undefined
    })
  }

  private isPublicRoute(url: string): boolean {
    void url
    return activeRoutePolicy(this.router.routerState.snapshot.root).access !== 'authenticated'
  }

  private triggerToast(message: string, level: ToastVariant) {
    if (Date.now() < this.toastMutedUntil) return
    this.toast.trigger(message, level)
  }

  private isVoluntaryLogoutRecent(): boolean {
    return Date.now() - this.lastVoluntaryLogoutAt <= this.voluntaryLogoutGraceMs
  }

  private startToastMuteWindow(): void {
    clearTimeout(this.toastMuteTimer)
    const delay = this.voluntaryLogoutToastSilenceMs
    const expiresAt = Date.now() + delay
    this.toastMutedUntil = expiresAt
    this.toastMuteTimer = setTimeout(() => {
      if (this.toastMutedUntil === expiresAt) this.toastMutedUntil = 0
    }, delay)
  }
}
