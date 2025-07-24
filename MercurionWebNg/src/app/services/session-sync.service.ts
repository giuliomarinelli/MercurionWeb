// src/app/services/session-sync.service.ts
import { Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RealtimeSocketService } from './socket.IO/realtime-socket.service';
import { UserContextService } from './context/user-context.service';
import { ToastService } from './toast.service';

/* ── tipi ── */
export type SessionSyncStatus =
  | 'unknown'          // stato iniziale
  | 'checking'         // handshake in corso
  | 'loggedIn'
  | 'anonymous'
  | 'sessionExpired'
  | 'disconnected'
  | 'error';

@Injectable({ providedIn: 'root' })
export class SessionSyncService {

  /* ------------------ stato ------------------ */
  private _status = signal<SessionSyncStatus>('unknown');
  public readonly status = this._status.asReadonly();

  private handshakePending = false;
  private lastAnonHS = 0;
  private readonly anonCooldown = 5_000;   // ms

  /* ------------------ ctor ------------------ */
  constructor(
    private readonly socket: RealtimeSocketService,
    private readonly userCtx: UserContextService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly zone: NgZone
  ) {

    /* eventi socket */
    this.socket.onConnect().subscribe(() => this.zone.run(() => this.syncSession()));
    this.socket.onDisconnect().subscribe(r => {
      if (r !== 'io client disconnect') this._status.set('disconnected');
    });
    this.socket.on('sv.pub.session_expired')
      .subscribe(() => this.zone.run(() => this.handleSessionExpired()));

    /* bootstrap */
    this.socket.connect();        // parte in public
    this.syncSession();           // primo handshake

    /* cross-tab login / logout */
    window.addEventListener('storage', e => {
      if (e.key !== 'login') return;
      e.newValue ? this.onExternalLogin(e.newValue)
        : this.onExternalLogout();
    });
  }

  /* ============ PUBLIC API ============ */

  /** usato dal flow di login  */
  resumeSession(initials: string) { this.onExternalLogin(initials); }

  /** forza un nuovo controllo immediato */
  forceSessionCheck() { this.syncSession(true); }

  /** logout esplicito */
  logout() {
    localStorage.removeItem('login');
    this.becomeAnonymous({ toast: 'Logout eseguito.', navigateIfProtected: true });
  }

  /** getter comodo */
  get currentStatus() { return this._status(); }

  /** accessibile dall’esterno (es. AppComponent) */
  async syncSession(force = false): Promise<void> {
    if (this.handshakePending && !force) return;

    const hasToken = !!localStorage.getItem('login');
    const now = Date.now();

    if (!hasToken && !force && now - this.lastAnonHS < this.anonCooldown) {
      if (this._status() !== 'anonymous') this._status.set('anonymous');
      return;
    }

    this.handshakePending = true;
    this._status.set('checking');

    try {
      hasToken ? this.socket.ensurePrivate()
        : this.socket.ensurePublic();

      if (!this.socket.isConnected) {
        await new Promise<void>(res => {
          const sub = this.socket.onConnect().subscribe(() => { sub.unsubscribe(); res(); });
          setTimeout(() => { sub.unsubscribe(); res(); }, 4_000);
        });
      }

      const ack = await this.socket.emit('so.pub.session_init');
      if (ack?.detail === 'websocket session init successful') {
        const initials = localStorage.getItem('login') ?? 'U';
        this.userCtx.setInitials(initials);
        this._status.set('loggedIn');
      } else {
        this.becomeAnonymous({ toast: 'Accesso non più valido.' });
        this.lastAnonHS = now;
      }

    } catch {
      this._status.set('error');
    } finally {
      this.handshakePending = false;
    }
  }

  /* ============ EVENTI SERVER ============ */
  private handleSessionExpired() {
    localStorage.removeItem('login');
    this.becomeAnonymous({
      toast: 'Sessione scaduta. Effettua di nuovo il login.',
      navigateIfProtected: true
    });
    this._status.set('sessionExpired');
  }

  /* ============ CROSS-TAB ============ */
  private onExternalLogin(initials: string) {
    this.userCtx.setInitials(initials);
    localStorage.setItem('login', initials);
    this._status.set('checking');
    this.syncSession(true);
  }

  private onExternalLogout() {
    this.becomeAnonymous({
      toast: 'Logout da un’altra scheda.',
      navigateIfProtected: true
    });
  }

  /* ============ helper ============ */
  private becomeAnonymous(opts: { toast?: string; navigateIfProtected?: boolean } = {}) {
    const { toast, navigateIfProtected } = opts;
    this.userCtx.clearInitials();
    this._status.set('anonymous');
    this.socket.ensurePublic();
    // if (toast) this.toast.trigger(toast, 'warn');
    if (navigateIfProtected && !this.isPublicRoute(this.router.url)) {
      this.router.navigate(['/login']);
    }
  }

  private readonly publicExact = ['/login', '/register', '/forgot', '/privacy', '/'];
  private readonly publicPrefix = ['/molecules/detail'];

  private isPublicRoute(url: string): boolean {
    const clean = url.split(/[?#]/)[0];
    return this.publicExact.includes(clean) ||
      this.publicPrefix.some(p => clean.startsWith(p));
  }
}
