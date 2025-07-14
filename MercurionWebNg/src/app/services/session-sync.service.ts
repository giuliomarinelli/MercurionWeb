// src/app/services/session-sync.service.ts
import { Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { RealtimeSocketService } from './socket.IO/realtime-socket.service';
import { UserContextService } from './context/user-context.service';

export type SessionSyncStatus =
  | 'pending'
  | 'handshake'
  | 'loggedIn'
  | 'sessionExpired'
  | 'disconnected'
  | 'error';

@Injectable({ providedIn: 'root' })
export class SessionSyncService {

  /* ───────────────────────────────────  state  ─────────────────────────────────── */
  private _status = signal<SessionSyncStatus>('pending');
  public  readonly status = this._status.asReadonly();

  private handshakePending = false;
  private retries          = 0;
  private readonly maxRetries = 5;

  /* ─────────────────────────────────── ctor  ─────────────────────────────────── */
  constructor(
    private readonly realtimeSocket: RealtimeSocketService,
    private readonly userContext   : UserContextService,
    private readonly toast         : ToastService,
    private readonly router        : Router,
    private readonly zone          : NgZone,
  ) {
    /* 1️⃣ – registriamo i listener PRIMA di aprire la socket */
    this.realtimeSocket.on('sv.pub.session_expired')
      .subscribe(() => this.zone.run(() => this.handleSessionExpired()));

    this.realtimeSocket.onConnect()
      .subscribe(() => {
        if (localStorage.getItem('login')) this.zone.run(() => this.syncSession());
      });

    this.realtimeSocket.onDisconnect()
      .subscribe(reason => {
        if (reason === 'io client disconnect') return;   // chiusura volontaria
        this.zone.run(() => {
          this._status.set('disconnected');
          this.toast.trigger('Connessione persa. Riconnessione in corso…', 'warn');
        });
      });

    /* 2️⃣ – apriamo la prima connessione anonima */
    this.realtimeSocket.connect();

    /* 3️⃣ – se la pagina parte già loggata (F5) facciamo handshake */
    if (localStorage.getItem('login')) {
      this.syncSession();
    }

    /* 4️⃣ – login/logout cross-tab via localStorage */
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key !== 'login') return;
      e.newValue ? this.resumeSession(e.newValue) : this.logout({ fromStorage: true });
    });
  }

  /* ─────────────────────────────────── handshake  ─────────────────────────────────── */
  public async syncSession(): Promise<void> {
    if (this.handshakePending) return;

    this.handshakePending = true;
    this._status.set('handshake');

    try {
      // ricrea o ri-usa la socket con il token attuale (se presente)
      await this.realtimeSocket.connect();

      const ack = await this.realtimeSocket.emit('so.pub.session_init');

      if (ack?.detail === 'websocket session init successful') {
        const initials = localStorage.getItem('login') ?? 'U';
        this.userContext.setInitials(initials);
        this._status.set('loggedIn');
        this.retries = 0;
      } else {
        /* handshake fallito ⇒ non siamo autenticati */
        this.logout({ silent: true });
      }
    } catch {
      this._status.set('error');
      if (this.retries < this.maxRetries) {
        setTimeout(() => this.syncSession(), 800 * (++this.retries));
      } else {
        this.logout({ silent: true });
      }
    } finally {
      this.handshakePending = false;
    }
  }

  /* ─────────────────────────────── session expired  ─────────────────────────────── */
  private handleSessionExpired(): void {
    const wasLoggedIn = this._status() === 'loggedIn';

    this._status.set('sessionExpired');
    this.userContext.clearInitials();
    localStorage.removeItem('login');

    if (wasLoggedIn) {
      this.toast.trigger('Sessione scaduta. Effettua nuovamente il login.', 'error');
      sessionStorage.setItem('logout', 'success');
      this.router.navigate(['/login']);
    }

    /* chiudo la socket privata e apro subito quella anonima */
    this.realtimeSocket.disconnect();
    this.realtimeSocket.connect();
  }

  /* ─────────────────────────────────── logout  ─────────────────────────────────── */
  public logout({ silent = false, fromStorage = false } = {}): void {
    this._status.set('sessionExpired');
    this.userContext.clearInitials();
    localStorage.removeItem('login');

    if (!silent) {
      const msg = fromStorage ? 'Logout da un’altra scheda' : 'Logout eseguito.';
      this.toast.trigger(msg, 'success');
    }

    this.realtimeSocket.disconnect();   // chiudo la privata
    this.realtimeSocket.connect();      // socket anonima
    this.router.navigate(['/login']);
  }

  /* ────────────────────────────── login da un’altra tab  ───────────────────────────── */
  public async resumeSession(initials: string): Promise<void> {
    this.userContext.setInitials(initials);
    this._status.set('loggedIn');
    await this.syncSession();           // handshake vero
  }

  /* utilità */
  public forceSessionCheck(): void { this.syncSession(); }
  public get currentStatus(): SessionSyncStatus { return this._status(); }
}
