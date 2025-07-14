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
  private _status = signal<SessionSyncStatus>('pending');
  public readonly status = this._status.asReadonly();

  private handshakePending = false;
  private retries = 0;
  private maxRetries = 5;

  constructor(
    private readonly realtimeSocket: RealtimeSocketService,
    private readonly userContext: UserContextService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly zone: NgZone
  ) {
    // Handlers WS attaccati una volta sola, sempre (singleton)
    this.setupWsEvents();

    // Logout cross-tab: se login viene rimosso da un'altra tab
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === 'login' && !event.newValue) {
        this.logout({ silent: false, fromStorage: true });
      }
    });
  }

  private setupWsEvents() {
    // WS CONNECT: handshake automatico solo quando serve
    this.realtimeSocket.onConnect().subscribe(() =>
      this.zone.run(() => {
        this._status.set('handshake');
        // Se c'è una sessione valida faccio handshake, sennò nulla
        if (localStorage.getItem('login')) {
          this.syncSession();
        }
      })
    );

    // WS DISCONNECT
    this.realtimeSocket.onDisconnect().subscribe(() =>
      this.zone.run(() => {
        this._status.set('disconnected');
        this.toast.trigger('Connessione persa. Riconnessione in corso...', 'warn');
      })
    );

    // EVENTO SESSION EXPIRED
    this.realtimeSocket.on('sv.pub.session_expired').subscribe(() =>
      this.zone.run(() => {
        this.handleSessionExpired();
      })
    );
  }

  /** Handshake & sync sessione via WS */
  public async syncSession({
    onSuccess,
    onFail,
  }: { onSuccess?: () => void; onFail?: (err?: any) => void } = {}) {
    if (this.handshakePending) return;
    this.handshakePending = true;
    this._status.set('handshake');
    try {
      // La connect è idempotente: la puoi chiamare sempre, riusa la connessione o la crea
      await this.realtimeSocket.connect();
      const ack = await this.realtimeSocket.emit('so.pub.session_init');
      if (ack?.detail === 'websocket session init successful') {
        const initials = localStorage.getItem('login') ?? 'U';
        this.userContext.setInitials(initials);
        this._status.set('loggedIn');
        this.toast.trigger('Bentornato!', 'success');
        onSuccess?.();
      } else {
        this.handleSessionExpired();
        onFail?.();
      }
    } catch (err) {
      this._status.set('error');
      this.toast.trigger('Errore durante handshake!', 'error');
      onFail?.(err);
      if (this.retries < this.maxRetries) {
        setTimeout(() => this.syncSession({ onSuccess, onFail }), 800 * (this.retries + 1));
        this.retries++;
      }
    } finally {
      this.handshakePending = false;
    }
  }

  private handleSessionExpired() {
    this._status.set('sessionExpired');
    this.userContext.clearInitials();
    this.toast.trigger('Sessione scaduta. Effettua nuovamente il login.', 'error');
    this.router.navigate(['/login']);
    // (Se serve, puoi forzare anche la disconnessione socket qui)
    this.realtimeSocket.disconnect();
  }

  public logout({ silent = false, fromStorage = false } = {}) {
    this.userContext.clearInitials();
    this._status.set('sessionExpired');
    if (!silent) {
      this.toast.trigger(fromStorage ? 'Logout da un\'altra scheda' : 'Logout eseguito.', 'success');
    }
    this.realtimeSocket.disconnect();
    this.router.navigate(['/login']);
  }

  /** Dopo login/MFA chiama resumeSession con le iniziali */
  public async resumeSession(initials: string) {
    this.userContext.setInitials(initials);
    this._status.set('loggedIn');
    await this.syncSession();
  }

  public forceSessionCheck() {
    this.syncSession();
  }

  public get currentStatus(): SessionSyncStatus {
    return this._status();
  }
}
