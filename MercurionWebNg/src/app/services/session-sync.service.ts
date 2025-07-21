// src/app/services/session-sync.service.ts
import { Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { RealtimeSocketService } from './socket.IO/realtime-socket.service';
import { UserContextService } from './context/user-context.service';

/* ───────────────────────────── tipi ───────────────────────────── */
export type SessionSyncStatus =
  | 'anonymous'
  | 'pending'          // login presente ma non ancora verificato
  | 'handshake'        // handshake in corso
  | 'loggedIn'
  | 'sessionExpired'   // espulso dal server
  | 'disconnected'     // perdita rete
  | 'error';

/* ───────────────────────── service ───────────────────────── */
@Injectable({ providedIn: 'root' })
export class SessionSyncService {

  /* stato reattivo esposto agli altri componenti */
  private _status = signal<SessionSyncStatus>(
    localStorage.getItem('login') ? 'pending' : 'anonymous'
  );
  public readonly status = this._status.asReadonly();

  /* bookkeeping interni */
  private handshakePending = false;
  private lastAnonHandshake = 0;              // anti-flood
  private readonly anonCooldownMs = 5_000;    // 5 s

  /* route pubbliche (exact e prefix) */
  private readonly publicExact = new Set(['/login', '/register', '/forgot', '/privacy', '/']);
  private readonly publicPrefix = ['/molecules/detail'];

  constructor(
    private readonly socket: RealtimeSocketService,
    private readonly userCtx: UserContextService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly zone: NgZone,
  ) {

    /* ───────── socket events ───────── */

    /** 1 – connessione stabilita */
    this.socket.onConnect().subscribe(() => {
      /* se veniamo da disconnected / pending facciamo handshake */
      if (!this.handshakePending &&
        (this._status() === 'pending' || this._status() === 'disconnected')) {
        this.zone.run(() => this.syncSession());
      }
    });

    /** 2 – disconnessione involontaria */
    this.socket.onDisconnect().subscribe(reason => {
      if (reason === 'io client disconnect') return;       // chiusura volontaria
      this.zone.run(() => {
        if (this._status() !== 'sessionExpired') {
          this._status.set('disconnected');
          this.toast.trigger('Connessione persa. Riconnessione…', 'warn');
        }
      });
    });

    /** 3 – evento di scadenza token dal server */
    this.socket.on('sv.pub.session_expired')
      .subscribe(() => this.zone.run(() => this.handleSessionExpired()));

    /* ───────── prima connessione ───────── */
    this.socket.connect();              // parte in public
    if (localStorage.getItem('login')) this.syncSession();

    /* ───────── sincronizzazione tab ───────── */
    window.addEventListener('storage', e => {
      if (e.key !== 'login') return;

      /* login creato da un’altra scheda */
      if (e.newValue) {
        this.resumeSession(e.newValue);
      }
      /* login rimosso da un’altra scheda */
      else {
        this.becomeAnonymous({ navigateIfProtected: true, showToast: true, fromStorage: true });
      }
    });
  }

  /* ══════════════ HANDSHAKE ══════════════ */
  public async syncSession(): Promise<void> {
    if (this.handshakePending) return;

    const tokenPresent = !!localStorage.getItem('login');
    const now = Date.now();

    /* anti-flood per anonimi */
    if (!tokenPresent && now - this.lastAnonHandshake < this.anonCooldownMs) {
      if (this._status() !== 'anonymous') this._status.set('anonymous');
      return;
    }

    this.handshakePending = true;
    this._status.set('handshake');

    try {
      /* switch socket -> private/public in modo idempotente */
      tokenPresent ? this.socket.ensurePrivate() : this.socket.ensurePublic();

      /* aspetta che la websocket sia davvero up (max 4 s) */
      if (!this.socket.isConnected) {
        await new Promise(r => {
          const sub = this.socket.onConnect().subscribe(() => { sub.unsubscribe(); r(null); });
          setTimeout(() => { sub.unsubscribe(); r(null); }, 4_000);
        });
      }

      /* handshake lato server */
      const ack = await this.socket.emit('so.pub.session_init');

      if (ack?.detail === 'websocket session init successful') {
        /* ok ⇒ logged-in */
        const initials = localStorage.getItem('login') ?? 'U';
        this.userCtx.setInitials(initials);
        localStorage.setItem('login', initials);      // garantisce coerenza
        this._status.set('loggedIn');
      } else {
        /* auth non valida ⇒ degrada a anonymous */
        this.becomeAnonymous({ degradeFromLoggedIn: true, navigateIfProtected: true });
        this.lastAnonHandshake = now;
      }

    } catch {
      this._status.set('error');
    } finally {
      this.handshakePending = false;
    }
  }

  /* ══════════════ SESSIONE SCADUTA ══════════════ */
  private handleSessionExpired(): void {
    const eraLoggato = this._status() === 'loggedIn';

    /* pulizia stato */
    this.userCtx.clearInitials();
    localStorage.removeItem('login');
    this._status.set('sessionExpired');

    /* socket: chiudi privata → apri pubblica */
    this.socket.disconnect();
    this.socket.ensurePublic();

    /* move UI */
    if (eraLoggato) {
      this.toast.trigger('Sessione scaduta. Effettua di nuovo il login.', 'error');
      this.router.navigate(['/login']);
    } else {
      this._status.set('anonymous');
    }
  }

  /* ══════════════ LOGOUT ESPLICITO ══════════════ */
  public logout(opts: { silent?: boolean } = {}): void {
    this.becomeAnonymous({
      degradeFromLoggedIn: true,
      navigateIfProtected: true,
      showToast: !opts.silent,
    });
  }

  /* ══════════════ LOGIN DA ALTRA TAB ══════════════ */
  public async resumeSession(initials: string): Promise<void> {
    this.userCtx.setInitials(initials);
    localStorage.setItem('login', initials);
    this._status.set('pending');
    await this.syncSession();
  }

  /* ══════════════ DIVENTA ANONIMO ══════════════ */
  private becomeAnonymous(opts: {
    degradeFromLoggedIn?: boolean;
    navigateIfProtected?: boolean;
    showToast?: boolean;
    fromStorage?: boolean;
  } = {}): void {

    const {
      degradeFromLoggedIn = false,
      navigateIfProtected = false,
      showToast = false,
      fromStorage = false,
    } = opts;

    /* pulizia stato */
    this.userCtx.clearInitials();
    localStorage.removeItem('login');
    this._status.set('anonymous');

    /* socket → public */
    this.socket.ensurePublic();

    /* toast */
    if (showToast) {
      const msg = fromStorage
        ? 'Logout eseguito da un’altra scheda'
        : 'Logout eseguito.'//: (degradeFromLoggedIn ? 'Accesso non più valido.' : 'Logout eseguito.');
      this.toast.trigger(msg, /*degradeFromLoggedIn ? 'warn' : */'success');
    }

    /* redirect se necessario */
    if (navigateIfProtected && !this.isPublicRoute(this.router.url)) {
      this.router.navigate(['/login']);
    }
  }

  /* ══════════════ UTILITIES ══════════════ */

  /** true se la rotta è pubblica */
  private isPublicRoute(url: string): boolean {
    /* strip query / hash */
    const clean = url.split(/[?#]/)[0];
    return (
      this.publicExact.has(clean) ||
      this.publicPrefix.some(p => clean.startsWith(p))
    );
  }

  /** forza una nuova verifica lato server */
  public forceSessionCheck(): void { this.syncSession(); }

  /** snapshot sincrono */
  public get currentStatus(): SessionSyncStatus { return this._status(); }
}
