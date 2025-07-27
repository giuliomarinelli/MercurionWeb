/* ──────────────────────────────────────────────────────────────
 *  SessionSyncService – sincronizza status login <‑> WS
 * ────────────────────────────────────────────────────────────── */

import { Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RealtimeSocketService } from './socket.IO/realtime-socket.service';
import { UserContextService } from './context/user-context.service';
import { ToastService } from './toast.service';
import { ToastContext } from '../components/common/toast/toast.component';

export type SessionSyncStatus =
  | 'unknown' | 'checking' | 'loggedIn' | 'anonymous'
  | 'sessionExpired' | 'disconnected' | 'error';

@Injectable({ providedIn: 'root' })
export class SessionSyncService {

  private _status = signal<SessionSyncStatus>('unknown');
  public readonly status = this._status.asReadonly();

  private handshakePending = false;
  private lastAnonHS = 0;
  private readonly anonCooldown = 5_000;

  constructor(
    private readonly socket: RealtimeSocketService,
    private readonly userCtx: UserContextService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly zone: NgZone,
  ) {
    /* eventi socket */
    this.socket.onConnect().subscribe(() => this.zone.run(() => this.syncSession()));
    this.socket.onDisconnect().subscribe(r => {
      if (r !== 'io client disconnect') this._status.set('disconnected');
    });

    /* 🔴 error centralizzato: Unauthorized → logout immediato */
    this.socket.on<{ detail: string }>('sv.pub.err')
      .subscribe(err => this.zone.run(() => {
        if (err?.detail === 'Unauthorized') this.becomeAnonymous({
          // toast: 'Sessione non più valida.',
          // level: 'error',
          navigateIfProtected: true
        });
      }));

    /* evento di scadenza inviato da PubSub */
    this.socket.on('sv.pub.session_expired')
      .subscribe(() => this.zone.run(() => this.handleSessionExpired()));

    /* bootstrap */
    this.socket.connect();   // parte in public
    this.syncSession();      // handshake iniziale

    /* cross‑tab */
    window.addEventListener('storage', e => {
      if (e.key !== 'login') return;
      e.newValue ? this.onExternalLogin(e.newValue)
        : this.onExternalLogout();
    });
  }

  /* ───────── PUBLIC API ───────── */

  resumeSession(initials: string) { this.onExternalLogin(initials); }
  forceSessionCheck() { this.syncSession(true); }
  logout() { this.becomeAnonymous({ toast: 'Logout eseguito.', level: 'success', navigateIfProtected: true }); }
  get currentStatus() { return this._status(); }

  /* ───────── Handshake ───────── */

  async syncSession(force = false): Promise<void> {
    if (this.handshakePending && !force) return;

    const now = Date.now();
    const hasToken = !!localStorage.getItem('login');

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

      /* ACK */
      const ack: any = await this.socket.emit('so.pub.session_init');

      if (ack?.detail === 'websocket session init successful') {
        const initials = localStorage.getItem('login') ?? 'U';
        this.userCtx.setInitials(initials);
        this._status.set('loggedIn');
      } else {
        this.becomeAnonymous();
        this.lastAnonHS = now;
      }

    } catch {
      this._status.set('error');
    } finally {
      this.handshakePending = false;
    }
  }

  /* ───────── Eventi server ───────── */

  private handleSessionExpired(): void {
    localStorage.removeItem('login');
    this.becomeAnonymous({
      toast: 'Sessione scaduta. Effettua di nuovo il login.',
      level: 'error',
      navigateIfProtected: true
    });
    this._status.set('sessionExpired');
  }

  /* ───────── Cross‑tab ───────── */

  private onExternalLogin(initials: string) {
    this.userCtx.setInitials(initials);
    localStorage.setItem('login', initials);
    this._status.set('checking');
    this.syncSession(true);
  }

  private onExternalLogout() {
    this.becomeAnonymous({
      toast: 'Logout da un’altra scheda.',
      level: 'success',
      navigateIfProtected: true
    });
  }

  /* ───────── Helper ───────── */

  private becomeAnonymous(opts: {
    toast?: string;
    level?: ToastContext;
    navigateIfProtected?: boolean;
  } = {}) {
    const { toast, level = 'warn', navigateIfProtected } = opts;

    this.userCtx.clearInitials();
    this._status.set('anonymous');
    this.socket.ensurePublic();
    if (toast) this.toast.trigger(toast, level);

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
