/* ──────────────────────────────────────────────────────────────
 * SessionSyncService – sync login <-> WS, handshake con lock
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

  // lock handshake: una sync per volta
  private handshakePending = false;
  private lastAnonHS = 0;
  private readonly anonCooldown = 5000;

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

    // errore applicativo
    this.socket.on<{ detail: string }>('sv.pub.err')
      .subscribe(err => this.zone.run(() => {
        if (err?.detail === 'Unauthorized') {
          // Niente refresh qui: ci pensa il socket service solo se scaduto
          void this.syncSession(true);
        }
      }));

    // evento broadcast di scadenza
    this.socket.on('sv.pub.session_expired')
      .subscribe(() => this.zone.run(() => this.handleSessionExpired()));

    // bootstrap: una sola entry-point
    void this.syncSession();

    // cross-tab storage
    let storageDebounce: any;
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key !== 'login' && e.key !== 'ws_accessToken') return;

      clearTimeout(storageDebounce);
      storageDebounce = setTimeout(() => {
        void this.syncSession(true);
      }, 30);
    });
  }

  /* ---------------- Public API ---------------- */

  resumeSession(initials: string) { this.onExternalLogin(initials); }
  forceSessionCheck() { void this.syncSession(true); }
  logout() { this.becomeAnonymous({ toast: 'Logout eseguito.', level: 'success', navigateIfProtected: true }); }
  get currentStatus() { return this._status(); }

  /* ---------------- Handshake core ---------------- */

  async syncSession(force = false): Promise<void> {
    if (this.handshakePending && !force) return;

    const now = Date.now();
    const hasLogin = !!localStorage.getItem('login');

    if (!hasLogin && !force && now - this.lastAnonHS < this.anonCooldown) {
      if (this._status() !== 'anonymous') this._status.set('anonymous');
      return;
    }

    this.handshakePending = true;
    this._status.set('checking');

    try {
      // 1) allinea modalità WS in base a "login"
      if (hasLogin) await this.socket.ensurePrivate();
      else await this.socket.ensurePublic();

      // 2) aspetta connessione e breve stabilizzazione
      const connected = await this.socket.waitConnected(4000);
      if (!connected) {
        this._status.set(hasLogin ? 'disconnected' : 'anonymous');
        if (!hasLogin) this.lastAnonHS = now;
        return;
      }
      await this.socket.waitStable();

      // 3) handshake (ACK server: “sei ancora loggato”)
      const ack: any = await this.socket.emit('so.pub.session_init');

      if (ack?.detail === 'websocket session init successful') {
        const initials = localStorage.getItem('login') ?? 'U';
        this.userCtx.setInitials(initials);
        this._status.set('loggedIn');
      } else {
        // Se c'è login ma ack negativo, non sloggare subito: rete/tempo
        if (hasLogin) this._status.set('disconnected');
        else {
          this._status.set('anonymous');
          this.lastAnonHS = now;
        }
      }

    } catch {
      this._status.set(hasLogin ? 'disconnected' : 'error');
    } finally {
      this.handshakePending = false;
    }
  }

  /* ---------------- Eventi server ---------------- */

  private handleSessionExpired(): void {
    localStorage.removeItem('login');
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
    this._status.set('checking');
    void this.syncSession(true);
  }

  private onExternalLogout() {
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
}
