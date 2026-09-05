/* ──────────────────────────────────────────────────────────────
 * SessionSyncService – sync login <-> WS con cookie guard
 * Regole:
 *  - "LoggedIn" ⇢ userCtx.initials !== '' **E** cookie (__logged_in | __logged_in_) === 'true'
 *  - PUBLIC: WS attiva ma senza handshake session_init
 *  - PRIVATE: handshake so.pub.session_init → ACK ⇒ mantieni PRIVATE
 *  - No ACK in PRIVATE: degrada a anonimo/public
 *  - Niente autologout da `storage` se il cookie è presente
 * ────────────────────────────────────────────────────────────── */
import { effect, Injectable, NgZone, signal } from '@angular/core'
import { Router } from '@angular/router'
import { AuthStateStore } from './auth-state.store'
import { ToastService } from './toast.service'
import { ToastContext } from '../components/common/toast/toast.component'
import { environment } from '../../environments/environment'
import { RealtimeSocketService } from './socket.IO/realtime-socket.service'
import {
  ApplicationErrorCode,
  hasApplicationErrorCode
} from '../utils/application-error.util'

export type SessionSyncStatus =
  | 'unknown'
  | 'checking'
  | 'loggedIn'
  | 'anonymous'
  | 'sessionExpired'
  | 'disconnected'
  | 'error'

@Injectable({ providedIn: 'root' })
export class SessionSyncService {
  private unauthorizedRetries = 0
  private readonly MAX_UNAUTH_RETRIES = 2

  private _handshakeTick = signal<number>(0)
  public readonly handshakeTick = this._handshakeTick.asReadonly()

  private _voluntaryLogoutTick = signal<number>(0)
  readonly voluntaryLogoutTick = this._voluntaryLogoutTick.asReadonly()

  private _status = signal<SessionSyncStatus>('unknown')
  public readonly status = this._status.asReadonly()

  private handshakePending = false
  private restartRequested = false

  private lastAnonHS = 0
  private readonly anonCooldown = 5_000

  private readonly MAX_TRIES = 15
  private readonly INTERVAL_MS = 1_000

  /** True dopo il primo ACK positivo in questa pagina. */
  private verifiedOnce = false

  /** Per invalidare cicli di polling concorrenti. */
  private pollRunId = 0

  private readonly publicExact = environment.PUBLIC_EXACT_PATHS
  private readonly publicPrefix = environment.PUBLIC_PREFIXES

  private toastMuteTimer!: ReturnType<typeof setTimeout>
  private toastMutedUntil = 0
  private readonly voluntaryLogoutToastSilenceMs = 3000
  private lastVoluntaryLogoutAt = 0
  private readonly voluntaryLogoutGraceMs = 12_000

  constructor(
    private readonly socket: RealtimeSocketService,
    private readonly authState: AuthStateStore,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly zone: NgZone
  ) {

    effect(() => {
      const t = this._voluntaryLogoutTick()
      if (t === 0) {
        return
      }
      this.startToastMuteWindow()
    })

    // eventi WS
    this.socket.onConnect().subscribe(() =>
      this.zone.run(() => {
        void this.syncSession()
      })
    )

    this.socket.onDisconnect().subscribe(r => {
      if (r !== 'io client disconnect') this._status.set('disconnected')
    })

    // errore applicativo → tentiamo resync (niente logout automatico)
    this.socket.onApplicationError().subscribe(err =>
      this.zone.run(() => {
        if (hasApplicationErrorCode(
          err,
          ApplicationErrorCode.AUTHENTICATION_UNAUTHORIZED
        )) {
          void this.handleUnauthorized()
        }
      })
    )

    // scadenza sessione lato server
    this.socket.onSessionExpired().subscribe(() =>
      this.zone.run(() => this.handleSessionExpired())
    )

    // bootstrap: parte PUBLIC, poi decide se uppare a PRIVATE
    this.socket.connect()
    void this.syncSession()

    // cross-tab con guardia cookie (evita falsi "logout da un’altra scheda")
    let storageDebounce: any
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return
      if (e.key !== 'login' && e.key !== 'ws_accessToken') return

      clearTimeout(storageDebounce)
      storageDebounce = setTimeout(() => {
        const initials = this.authState.getPersistedInitials()
        const wsTok = this.authState.getWsAccessToken()

        // logout cross-tab SOLO se manca anche il cookie "logged_in"
        if (e.key === 'login' && !initials) {
          if (!this.hasClientLoginCookieTrue()) this.onExternalLogout()
          return
        }

        // login presente + token presente → tenta PRIVATE e sync
        if (initials && wsTok) {
          void this.socket.ensurePrivate(wsTok)
          void this.syncSession(true)
          return
        }

        // login presente ma token assente → sync (ci penserà il socket a refreshare se può)
        if (initials && !wsTok) {
          void this.syncSession(true)
          return
        }
      }, 30)
    })
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
      this.authState.logout()
      this.becomeAnonymous({
        navigateIfProtected: true,
        removeLoginKey: false
      })
    })
  }

  get currentStatus() {
    return this._status()
  }

  /* ---------------- Handshake core ---------------- */

  async syncSession(force = false): Promise<void> {
    // se siamo già privati e marcati loggedIn, evita rumore
    if (!force && this._status() === 'loggedIn' && this.socket.getMode() === 'private') return

    if (this.handshakePending) {
      if (force) this.restartRequested = true
      return
    }

    const now = Date.now()
    const initials = this.authState.getPersistedInitials() ?? ''
    const cookieLogged = this.hasClientLoginCookieTrue()

    // login locale senza cookie → stato inconsistente: considera la sessione scaduta
    if (initials && !cookieLogged) {
      this.handleSessionExpired()
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
      const startMode = this.socket.getMode()
      await this.pollHandshake(startMode, targetIsPrivate)
    } catch {
      this._status.set(targetIsPrivate ? 'disconnected' : 'error')
    } finally {
      this.handshakePending = false
      if (this.restartRequested) {
        this.restartRequested = false
        queueMicrotask(() => {
          void this.syncSession(true)
        })
      }
    }
  }

  private async pollHandshake(startMode: 'public' | 'private', targetIsPrivate: boolean): Promise<void> {
    const myRun = ++this.pollRunId

    for (let i = 1; i <= this.MAX_TRIES; i++) {
      if (myRun !== this.pollRunId) return

      if (!this.socket.isConnected) {
        this._status.set(targetIsPrivate ? 'disconnected' : 'anonymous')
        if (!targetIsPrivate) this.lastAnonHS = Date.now()
        return
      }

      const ack = await this.socket.emitSessionInit(1200)

      if (ack?.detail === 'websocket session init successful') {
        this.unauthorizedRetries = 0

        // ACK riuscito: setta iniziali se le abbiamo, e valida cookie
        const initials = this.authState.getPersistedInitials() ?? 'U'
        this.authState.resumeFromServer(initials)

        // login “valido” solo con cookie = true
        if (this.hasClientLoginCookieTrue()) {
          this.verifiedOnce = true

          if (startMode === 'public') {
            await this.socket.ensurePrivate()
            if (this.socket.getMode() === 'private') {
              this._status.set('loggedIn')
            } else {
              this._status.set(targetIsPrivate ? 'disconnected' : 'anonymous')
              if (!targetIsPrivate) this.lastAnonHS = Date.now()
            }
          } else {
            // già private: mantieni la connessione
            this._status.set('loggedIn')
          }
        } else {
          // niente cookie ⇒ consideraci anonimi anche con ACK
          this._status.set('anonymous')
          this.lastAnonHS = Date.now()
          await this.socket.ensurePublic()
        }
        return
      }

      // nessun ACK → continua
      this._status.set(targetIsPrivate ? 'disconnected' : 'anonymous')
      if (!targetIsPrivate) this.lastAnonHS = Date.now()

      if (i < this.MAX_TRIES) await this.sleep(this.INTERVAL_MS)
    }

    // === 15 tentativi falliti ===
    // Se eravamo in PRIVATE e nel frattempo il cookie è sparito → degrada a anonimo
    if (targetIsPrivate && !this.verifiedOnce && !this.hasClientLoginCookieTrue()) {
      this.authState.logout()
      this._status.set('anonymous')
      this.lastAnonHS = Date.now()
      await this.socket.reconnectPublicNow()
    }
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

    // Troppi tentativi → trattiamo come sessione scaduta
    if (this.unauthorizedRetries >= this.MAX_UNAUTH_RETRIES) {
      this.unauthorizedRetries = 0
      this.handleSessionExpired()
      return
    }

    this.unauthorizedRetries++

    // 1) Forza refresh del ws_accessToken
    await this.socket.ensurePrivate(undefined, { forceRefresh: true })
    // 2) Rilancia un sync completo (che rilancerà il pollHandshake)
    await this.syncSession(true)
  }

  private handleSessionExpired(): void {
    const voluntary = this.isVoluntaryLogoutRecent()
    // evento di scadenza lato server → consideralo definitivo anche se il cookie esiste ancora
    const alreadyExpired = this._status() === 'sessionExpired'
    this.authState.invalidate('server-invalidated')
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

  private onExternalLogin(initials: string) {
    this.authState.beginAuthentication('restore')
    this.authState.setPersistedInitials(initials)
    this._status.set('checking')
    void this.syncSession(true)
  }

  private onExternalLogout() {
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
    const ck = document.cookie || ''
    const v1 = this.readCookie('__logged_in')
    const v2 = this.readCookie('__logged_in_')
    return v1 === 'true' || v2 === 'true'
  }

  private readCookie(name: string): string | null {
    const m = (document.cookie || '').match(
      new RegExp('(?:^|;\\s*)' + name.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&') + '=([^;]*)')
    )
    return m ? decodeURIComponent(m[1]) : null
  }

  private becomeAnonymous(
    opts: {
      toast?: string
      level?: ToastContext
      navigateIfProtected?: boolean
      /** se true rimuove anche la chiave 'login' */
      removeLoginKey?: boolean
    } = {}
  ) {
    const { toast, level = 'warn', navigateIfProtected, removeLoginKey } = opts

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
    const fullUrl = this.router.url.startsWith('/') ? this.router.url : `/${this.router.url}`
    const encoded = encodeURIComponent(fullUrl)
    this.router.navigateByUrl(`/login?redirect_to=${encoded}`)
  }

  private isPublicRoute(url: string): boolean {
    const clean = url.split(/[?#]/)[0]

    // ✅ login family SEMPRE public (incl. /login/mfa/...)
    if (clean === '/login' || clean.startsWith('/login/')) return true

    return (
      this.publicExact.includes(clean) ||
      this.publicPrefix.some(p => clean.startsWith(p))
    )
  }

  private triggerToast(message: string, level: ToastContext) {
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



  private sleep(ms: number) {
    return new Promise<void>(r => setTimeout(r, ms))
  }
}
