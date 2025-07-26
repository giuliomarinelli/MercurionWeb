/* ──────────────────────────────────────────────────────────────
 *  SessionSyncService – sincronizza lo stato di login fra WS,
 *  localStorage e routing (no più logout falsi su time‑out ACK)
 * ────────────────────────────────────────────────────────────── */

import { Injectable, NgZone, signal } from '@angular/core';
import { Router }                     from '@angular/router';
import { RealtimeSocketService }      from './socket.IO/realtime-socket.service';
import { UserContextService }         from './context/user-context.service';
import { ToastService }               from './toast.service';
import { ToastContext }               from '../components/common/toast/toast.component';

export type SessionSyncStatus =
  | 'unknown'          // avvio
  | 'checking'         // hand‑shake in corso
  | 'loggedIn'         // ok
  | 'anonymous'        // nessun token valido
  | 'sessionExpired'   // evento dal server
  | 'disconnected'     // WS giù / rete KO
  | 'error';           // eccezione grave

@Injectable({ providedIn: 'root' })
export class SessionSyncService {

  /* ────── stato reattivo ────── */
  private _status = signal<SessionSyncStatus>('unknown');
  public readonly status = this._status.asReadonly();

  /* ────── internals ────── */
  private handshakePending = false;
  private lastAnonHS       = 0;
  private readonly anonCooldown = 5_000;        // ms

  /* ────── routing helper ────── */
  private readonly publicExact  = ['/login','/register','/forgot','/privacy','/'];
  private readonly publicPrefix = ['/molecules/detail'];

  /* ════════════════════════════════════════════════════════════ */
  constructor(
    private readonly socket  : RealtimeSocketService,
    private readonly userCtx : UserContextService,
    private readonly toast   : ToastService,
    private readonly router  : Router,
    private readonly zone    : NgZone
  ) {

    /* WS events ------------------------------------------------ */
    this.socket.onConnect()
      .subscribe(() => this.zone.run(() => this.syncSession()));
    this.socket.onDisconnect()
      .subscribe(r => {
        if (r !== 'io client disconnect') this._status.set('disconnected');
      });

    /* errore esplicito dal server */
    this.socket.on<{ detail: string }>('sv.pub.err')
      .subscribe(err => {
        if (err?.detail === 'Unauthorized') {
          this.zone.run(() =>
            this.becomeAnonymous({
              toast : 'Autorizzazione scaduta.',
              level : 'error',
              navigateIfProtected: true
            })
          );
        }
      });

    /* evento di scadenza sessione */
    this.socket.on('sv.pub.session_expired')
      .subscribe(() => this.zone.run(() => this.handleSessionExpired()));

    /* bootstrap ------------------------------------------------ */
    this.socket.ensurePublic();   // parte sempre anonima
    this.syncSession();           // primo hand‑shake

    /* cross‑tab sync ------------------------------------------ */
    window.addEventListener('storage', e => {
      if (e.key !== 'login') return;
      e.newValue ? this.onExternalLogin(e.newValue)
                 : this.onExternalLogout();
    });
  }

  /* ═════════════ API esterna ═════════════ */

  resumeSession(initials: string) { this.onExternalLogin(initials); }
  forceSessionCheck()             { this.syncSession(true); }

  logout(): void {
    localStorage.removeItem('login');
    this.becomeAnonymous({
      toast : 'Logout eseguito.',
      level : 'success',
      navigateIfProtected: true
    });
  }

  get currentStatus() { return this._status(); }

  /* ═════════════ hand‑shake principale ═════════════ */
  async syncSession(force = false): Promise<void> {
    if (this.handshakePending && !force) return;

    const hasToken = !!localStorage.getItem('login');
    const now      = Date.now();

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
        // aspetta davvero la connessione; nessun timeout qui
        await new Promise<void>(res => {
          const sub = this.socket.onConnect()
            .subscribe(() => { sub.unsubscribe(); res(); });
        });
      }

      /* ACK con timeout più generoso (8 s) */
      const ack: any = await this.socket.emit('so.pub.session_init', undefined, 8_000);

      switch (ack?.detail) {

        case 'websocket session init successful': {
          const initials = localStorage.getItem('login') ?? 'U';
          this.userCtx.setInitials(initials);
          this._status.set('loggedIn');
          break;
        }

        case 'Unauthorized': {
          this.becomeAnonymous({
            toast: 'Accesso non più valido.',
            level: 'error',
            navigateIfProtected: true
          });
          break;
        }

        /* nessun ACK o risposta sconosciuta → rete / server lento */
        default:
          this._status.set('disconnected');   // NON logout, attendo riconnessione
      }

    } catch {
      this._status.set('disconnected');
    } finally {
      this.handshakePending = false;
    }
  }

  /* ═════════════ eventi dal server ═════════════ */
  private handleSessionExpired(): void {
    localStorage.removeItem('login');
    this.becomeAnonymous({
      toast : 'Sessione scaduta. Effettua di nuovo il login.',
      level : 'error',
      navigateIfProtected: true
    });
    this._status.set('sessionExpired');
  }

  /* ═════════════ cross‑tab helpers ═════════════ */
  private onExternalLogin(initials: string): void {
    this.userCtx.setInitials(initials);
    localStorage.setItem('login', initials);
    this._status.set('checking');
    this.syncSession(true);
  }

  private onExternalLogout(): void {
    this.becomeAnonymous({
      toast : 'Logout da un’altra scheda.',
      level : 'success',
      navigateIfProtected: true
    });
  }

  /* ═════════════ helper comuni ═════════════ */
  private becomeAnonymous(opts: {
    toast?: string;
    level?: ToastContext;
    navigateIfProtected?: boolean;
  } = {}): void {

    const { toast, level = 'success', navigateIfProtected } = opts;

    this.userCtx.clearInitials();
    this._status.set('anonymous');
    this.socket.ensurePublic();

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
