/* ──────────────────────────────────────────────────────────────
 * SessionSyncService – sync login <-> WS, handshake con lock
 * Policy:
 *  - In PUBLIC: 15 tentativi (1/s) di so.pub.session_init.
 *      · ACK → lock, disconnect, reconnect PRIVATE
 *      · No ACK → smetti, resta PUBLIC
 *  - In PRIVATE: 15 tentativi (1/s) di so.pub.session_init.
 *      · ACK → mantieni PRIVATE (no reconnect)
 *      · No ACK → smetti, resta PRIVATE
 *  - Nessun backoff. Nessun setInterval: loop sequenziale.
 *  - Latch anti-restart: dopo 15 tentativi non si riparte finché non c’è “force”
 *    o cambia login/token o c’è una nuova `connect`.
 * ────────────────────────────────────────────────────────────── */
import { Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RealtimeSocketService } from './socket.IO/realtime-socket.service';
import { UserContextService } from './context/user-context.service';
import { ToastService } from './toast.service';
import { ToastContext } from '../components/common/toast/toast.component';
import { environment } from '../../environments/environment.development';

export type SessionSyncStatus =
  | 'unknown' | 'checking' | 'loggedIn' | 'anonymous'
  | 'sessionExpired' | 'disconnected' | 'error';

@Injectable({ providedIn: 'root' })
export class SessionSyncService {
  private _status = signal<SessionSyncStatus>('unknown');
  public readonly status = this._status.asReadonly();

  // lock: una run alla volta
  private handshakePending = false;
  private restartRequested = false;

  // latch: dopo 15 tentativi non ripartire automaticamente
  private publicPollDone = false;
  private privatePollDone = false;

  // cooldown anon
  private lastAnonHS = 0;
  private readonly anonCooldown = 5000;

  // parametri polling
  private readonly MAX_TRIES = 15;
  private readonly INTERVAL_MS = 1000;

  // invalida eventuali loop precedenti
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
    // onConnect: reset latch (nuova connessione ⇒ posso riprovare)
    this.socket.onConnect().subscribe(() => this.zone.run(() => {
      this.publicPollDone = false;
      this.privatePollDone = false;
      void this.syncSession(true);
    }));

    this.socket.onDisconnect().subscribe(r => {
      if (r !== 'io client disconnect') this._status.set('disconnected');
    });

    // IMPORTANTISSIMO: NON rilanciare sync su sv.pub.err (causa loop).
    this.socket.on<{ detail: string }>('sv.pub.err').subscribe(() => { /* no-op */ });

    this.socket.on('sv.pub.session_expired')
      .subscribe(() => this.zone.run(() => this.handleSessionExpired()));

    // bootstrap
    void this.syncSession();

    // cross-tab: cambio login/token ⇒ reset latch e forza sync
    let storageDebounce: any;
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key !== 'login' && e.key !== 'ws_accessToken') return;
      clearTimeout(storageDebounce);
      storageDebounce = setTimeout(() => {
        this.publicPollDone = false;
        this.privatePollDone = false;
        void this.syncSession(true);
      }, 30);
    });
  }

  /* ---------------- Public API ---------------- */

  resumeSession(initials: string) { this.onExternalLogin(initials); }
  forceSessionCheck() {
    // force ⇒ reset latch e rilancia
    this.publicPollDone = false;
    this.privatePollDone = false;
    void this.syncSession(true);
  }
  logout() { this.becomeAnonymous({ toast: 'Logout eseguito.', level: 'success', navigateIfProtected: true }); }
  get currentStatus() { return this._status(); }

  /* ---------------- Handshake core ---------------- */

  async syncSession(force = false): Promise<void> {
    if (this.handshakePending) {
      if (force) this.restartRequested = true;
      return;
    }

    const now = Date.now();
    const hasLogin = !!localStorage.getItem('login');

    if (!hasLogin && !force && now - this.lastAnonHS < this.anonCooldown) {
      if (this._status() !== 'anonymous') this._status.set('anonymous');
      return;
    }

    this.handshakePending = true;
    this._status.set('checking');

    try {
      // allinea modalità in base a "login" locale
      if (hasLogin) await this.socket.ensurePrivate();
      else await this.socket.ensurePublic();

      const connected = await this.socket.waitConnected(4000);
      if (!connected) {
        this._status.set(hasLogin ? 'disconnected' : 'anonymous');
        if (!hasLogin) this.lastAnonHS = now;
        return;
      }
      await this.socket.waitStable();

      const mode = this.socket.getMode();

      // rispetta i latch (se non è un force)
      if (!force) {
        if (mode === 'public' && this.publicPollDone) return;
        if (mode === 'private' && this.privatePollDone) return;
      }

      await this.pollHandshake(mode, hasLogin);

    } catch {
      this._status.set(hasLogin ? 'disconnected' : 'error');
    } finally {
      this.handshakePending = false;
      if (this.restartRequested) {
        this.restartRequested = false;
        queueMicrotask(() => { void this.syncSession(true); });
      }
    }
  }

  private async pollHandshake(startMode: 'public' | 'private', hasLogin: boolean): Promise<void> {
    const myRun = ++this.pollRunId;

    for (let i = 1; i <= this.MAX_TRIES; i++) {
      if (myRun !== this.pollRunId) return;       // invalidato da una nuova run
      if (!this.socket.isConnected) {
        if (hasLogin) this._status.set('disconnected');
        else {
          this.userCtx.logout();
          this._status.set('anonymous');
          this.lastAnonHS = Date.now();
        }
        this.setLatch(startMode, true);
        return;
      }

      const ack: any = await this.socket.emit('so.pub.session_init', undefined, 1100);

      if (ack?.detail === 'websocket session init successful') {
        const initials = localStorage.getItem('login') ?? 'U';
        this.userCtx.setInitials(initials);

        if (startMode === 'public') {
          await this.socket.ensurePrivate();
          if (this.socket.getMode() === 'private') {
            this._status.set('loggedIn');
          } else {
            if (hasLogin) this._status.set('disconnected');
            else {
              this.userCtx.logout();
              this._status.set('anonymous');
              this.lastAnonHS = Date.now();
            }
          }
          this.setLatch('public', true); // chiudi il ciclo in PUBLIC
        } else {
          // PRIVATE + ACK ⇒ ok, resta private
          this._status.set('loggedIn');
          this.setLatch('private', true);
        }
        return;
      }

      // nessun ACK: informativo
      if (hasLogin) this._status.set('disconnected');
      else {
        this.userCtx.logout();
        this._status.set('anonymous');
        this.lastAnonHS = Date.now();
      }

      if (i < this.MAX_TRIES) await this.sleep(this.INTERVAL_MS);
    }

    // esauriti 15 tentativi → imposta latch e basta
    this.setLatch(startMode, true);
    return;
  }

  private setLatch(mode: 'public' | 'private', done: boolean) {
    if (mode === 'public') this.publicPollDone = done;
    else this.privatePollDone = done;
  }

  /* ---------------- Eventi server ---------------- */

  private handleSessionExpired(): void {
    localStorage.removeItem('login');
    this.publicPollDone = false;
    this.privatePollDone = false;

    this.becomeAnonymous({
      toast: 'Sessione scaduta. Effettua di nuovo il login.',
      level: 'error',
      navigateIfProtected: true
    });
    this._status.set('sessionExpired');
  }

  /* ---------------- Cross-tab helpers ---------------- */

  private onExternalLogin(initials: string) {
    this.userCtx.setInitials(initials);
    localStorage.setItem('login', initials);
    // cambio login ⇒ posso riprovare
    this.publicPollDone = false;
    this.privatePollDone = false;
    this._status.set('checking');
    void this.syncSession(true);
  }

  private onExternalLogout() {
    this.publicPollDone = false;
    this.privatePollDone = false;
    this.becomeAnonymous({
      toast: 'Logout da un’altra scheda.',
      level: 'success',
      navigateIfProtected: true
    });
  }

  /* ---------------- Helper ---------------- */

  private becomeAnonymous(opts: {
    toast?: string;
    level?: ToastContext;
    navigateIfProtected?: boolean;
  } = {}) {
    const { toast, level = 'warn', navigateIfProtected } = opts;
    this.userCtx.clearInitials();
    this._status.set('anonymous');
    void this.socket.ensurePublic();
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

  private sleep(ms: number) {
    return new Promise<void>(r => setTimeout(r, ms));
  }
}
