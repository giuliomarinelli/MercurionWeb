/* ──────────────────────────────────────────────────────────────
 * SessionSyncService – sync login <-> WS con cookie guard
 * Regole:
 *  - "LoggedIn" ⇢ userCtx.initials !== '' **E** cookie (__logged_in | __logged_in_) === 'true'
 *  - PUBLIC: 15× (1/s) so.pub.session_init → ACK ⇒ upgrade PRIVATE
 *  - PRIVATE: 15× (1/s) so.pub.session_init → ACK ⇒ resti PRIVATE
 *  - No ACK: stop a 15, mantieni modalità. Se MAI verificato e cookie assente ⇒ stato anonimo.
 *  - Niente autologout da `storage` se il cookie è presente.
 * ────────────────────────────────────────────────────────────── */
import { Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UserContextService } from './context/user-context.service';
import { ToastService } from './toast.service';
import { ToastContext } from '../components/common/toast/toast.component';
import { environment } from '../../environments/environment.development';
import { RealtimeSocketService } from './socket.IO/realtime-socket.service';

export type SessionSyncStatus =
  | 'unknown' | 'checking' | 'loggedIn' | 'anonymous'
  | 'sessionExpired' | 'disconnected' | 'error';

@Injectable({ providedIn: 'root' })
export class SessionSyncService {

  private _handshakeTick = signal(0);
  public readonly handshakeTick = this._handshakeTick.asReadonly();

  private _status = signal<SessionSyncStatus>('unknown');
  public readonly status = this._status.asReadonly();

  private handshakePending = false;
  private restartRequested = false;

  private lastAnonHS = 0;
  private readonly anonCooldown = 5_000;

  private readonly MAX_TRIES = 15;
  private readonly INTERVAL_MS = 1_000;

  /** True dopo il primo ACK positivo in questa pagina. */
  private verifiedOnce = false;

  /** Per invalidare cicli di polling concorrenti. */
  private pollRunId = 0;

  private readonly publicExact = environment.PUBLIC_EXACT_PATHS;
  private readonly publicPrefix = environment.PUBLIC_PREFIXES;

  constructor(
    private readonly socket: RealtimeSocketService,
    private readonly userCtx: UserContextService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly zone: NgZone,
  ) {
    // eventi WS
    this.socket.onConnect().subscribe(() => this.zone.run(() => { void this.syncSession(); }));
    this.socket.onDisconnect().subscribe(r => {
      if (r !== 'io client disconnect') this._status.set('disconnected');
    });

    // errore applicativo → tentiamo resync (niente logout automatico)
    this.socket.on<{ detail: string }>('sv.pub.err')
      .subscribe(err => this.zone.run(() => {
        if (err?.detail === 'Unauthorized') { void this.syncSession(true); }
      }));

    // scadenza sessione lato server
    this.socket.on('sv.pub.session_expired')
      .subscribe(() => this.zone.run(() => this.handleSessionExpired()));

    // bootstrap
    this.socket.connect();           // parte PUBLIC
    void this.syncSession();         // handshake iniziale

    // cross-tab con guardia cookie (evita falsi "logout da un’altra scheda")
    let storageDebounce: any;
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return;
      if (e.key !== 'login' && e.key !== 'ws_accessToken') return;

      clearTimeout(storageDebounce);
      storageDebounce = setTimeout(() => {
        const initials = localStorage.getItem('login');
        const wsTok = localStorage.getItem('ws_accessToken');

        // logout cross-tab SOLO se manca anche il cookie "logged_in"
        if (e.key === 'login' && !initials) {
          if (!this.hasClientLoginCookieTrue()) {
            this.onExternalLogout();
          }
          return;
        }

        // login presente + token presente → tenta PRIVATE e sync
        if (initials && wsTok) {
          void this.socket.ensurePrivate(wsTok);
          void this.syncSession(true);
          return;
        }

        // login presente ma token assente → sync (ci penserà il socket a refreshare se può)
        if (initials && !wsTok) {
          void this.syncSession(true);
          return;
        }
      }, 30);
    });
  }

  /* ---------------- Public API ---------------- */

  resumeSession(initials: string) {
    this.onExternalLogin(initials)
    this._handshakeTick.update(x => x + 1)
  }

  requestHandshake() {
    this._handshakeTick.update(x => x + 1)
  }

  forceSessionCheck() { void this.syncSession(true); }
  logout() {
    // logout esplicito: togli "login" e degrada WS a PUBLIC subito
    localStorage.removeItem('login');
    this.becomeAnonymous({ toast: 'Logout eseguito.', level: 'success', navigateIfProtected: true, removeLoginKey: false });
  }
  get currentStatus() { return this._status(); }

  /* ---------------- Handshake core ---------------- */

  async syncSession(force = false): Promise<void> {
    // se siamo già privati e marcati loggedIn, evita rumore
    if (!force && this._status() === 'loggedIn' && this.socket.getMode() === 'private') return;

    if (this.handshakePending) {
      if (force) this.restartRequested = true;
      return;
    }

    const now = Date.now();
    const initials = localStorage.getItem('login') ?? '';
    const cookieLogged = this.hasClientLoginCookieTrue();

    // Regola nuova: senza cookie NON consideriamo loggati → puntiamo PUBLIC
    const targetIsPrivate = cookieLogged && initials !== '';

    // cooldown se anon
    if (!targetIsPrivate && !force && now - this.lastAnonHS < this.anonCooldown) {
      if (this._status() !== 'anonymous') this._status.set('anonymous');
      return;
    }

    this.handshakePending = true;
    this._status.set('checking');

    try {
      if (targetIsPrivate) await this.socket.ensurePrivate();
      else await this.socket.ensurePublic();

      const connected = await this.socket.waitConnected(4000);
      if (!connected) {
        this._status.set(targetIsPrivate ? 'disconnected' : 'anonymous');
        if (!targetIsPrivate) this.lastAnonHS = now;
        return;
      }
      await this.socket.waitStable();

      const startMode = this.socket.getMode();
      await this.pollHandshake(startMode, targetIsPrivate);

    } catch {
      this._status.set(targetIsPrivate ? 'disconnected' : 'error');
    } finally {
      this.handshakePending = false;
      if (this.restartRequested) {
        this.restartRequested = false;
        queueMicrotask(() => { void this.syncSession(true); });
      }
    }
  }

  private async pollHandshake(startMode: 'public' | 'private', targetIsPrivate: boolean): Promise<void> {
    const myRun = ++this.pollRunId;

    for (let i = 1; i <= this.MAX_TRIES; i++) {
      if (myRun !== this.pollRunId) return;

      if (!this.socket.isConnected) {
        this._status.set(targetIsPrivate ? 'disconnected' : 'anonymous');
        if (!targetIsPrivate) this.lastAnonHS = Date.now();
        return;
      }

      const ack: any = await this.socket.emit('so.pub.session_init', undefined, 1200);

      if (ack?.detail === 'websocket session init successful') {
        // ACK riuscito: setta iniziali se le abbiamo, e valida cookie
        const initials = localStorage.getItem('login') ?? 'U';
        this.userCtx.setInitials(initials);

        // login “valido” solo con cookie = true
        if (this.hasClientLoginCookieTrue()) {
          this.verifiedOnce = true;

          if (startMode === 'public') {
            await this.socket.ensurePrivate();
            if (this.socket.getMode() === 'private') {
              this._status.set('loggedIn');
            } else {
              this._status.set(targetIsPrivate ? 'disconnected' : 'anonymous');
              if (!targetIsPrivate) this.lastAnonHS = Date.now();
            }
          } else {
            // già private: mantieni la connessione
            this._status.set('loggedIn');
          }
        } else {
          // niente cookie ⇒ consideraci anonimi anche con ACK (caso raro, ma coerente con la policy)
          this._status.set('anonymous');
          this.lastAnonHS = Date.now();
          await this.socket.ensurePublic();
        }
        return; // STOP polling
      }

      // nessun ACK → continua
      this._status.set(targetIsPrivate ? 'disconnected' : 'anonymous');
      if (!targetIsPrivate) this.lastAnonHS = Date.now();

      if (i < this.MAX_TRIES) await this.sleep(this.INTERVAL_MS);
    }

    // === 15 tentativi falliti ===
    // Se non abbiamo mai verificato e NON c'è cookie ⇒ evitiamo UI fantasma
    if (!this.verifiedOnce && !this.hasClientLoginCookieTrue()) {
      // ripulisci UI a stato anonimo e riporta WS in PUBLIC
      this.userCtx.clearInitials();
      this._status.set('anonymous');
      this.lastAnonHS = Date.now();
      await this.socket.reconnectPublicNow();
    }
    return;
  }

  /* ---------------- Eventi server ---------------- */

  private handleSessionExpired(): void {
    // scadenza certa → rimuovi login locale e vai anonimo
    localStorage.removeItem('login');
    this.becomeAnonymous({
      toast: 'Sessione scaduta. Effettua di nuovo il login.',
      level: 'error',
      navigateIfProtected: true,
      removeLoginKey: false
    });
    this._status.set('sessionExpired');
  }

  /* ---------------- Cross-tab helpers ---------------- */

  private onExternalLogin(initials: string) {
    this.userCtx.setInitials(initials);
    localStorage.setItem('login', initials);
    this._status.set('checking');
    void this.syncSession(true);
  }

  private onExternalLogout() {
    this.becomeAnonymous({
      toast: 'Logout da un’altra scheda.',
      level: 'success',
      navigateIfProtected: true,
      removeLoginKey: false
    });
  }

  /* ---------------- Helper ---------------- */

  /** true se esiste __logged_in o __logged_in_ con valore 'true' (non httpOnly). */
  private hasClientLoginCookieTrue(): boolean {
    const ck = document.cookie || '';
    const v1 = this.readCookie('__logged_in');
    const v2 = this.readCookie('__logged_in_');
    return (v1 === 'true') || (v2 === 'true');
  }

  private readCookie(name: string): string | null {
    const m = (document.cookie || '').match(new RegExp('(?:^|;\\s*)' + name.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  private becomeAnonymous(opts: {
    toast?: string;
    level?: ToastContext;
    navigateIfProtected?: boolean;
    /** se true rimuove anche la chiave 'login' */
    removeLoginKey?: boolean;
  } = {}) {
    const { toast, level = 'warn', navigateIfProtected, removeLoginKey } = opts;

    if (removeLoginKey) localStorage.removeItem('login');

    this.userCtx.clearInitials();
    this._status.set('anonymous');

    // Ripristina SUBITO la WS pubblica (senza reload)
    void this.socket.reconnectPublicNow();

    if (toast) this.toast.trigger(toast, level);

    if (navigateIfProtected && !this.isPublicRoute(this.router.url)) {
      this.router.navigate(['/login']);
    }
  }

  private isPublicRoute(url: string): boolean {
    const clean = url.split(/[?#]/)[0];
    return this.publicExact.includes(clean) ||
      this.publicPrefix.some(p => clean.startsWith(p));
  }

  private sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }
}
