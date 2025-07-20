// src/app/services/session-sync.service.ts
import { Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { RealtimeSocketService } from './socket.IO/realtime-socket.service';
import { UserContextService } from './context/user-context.service';

export type SessionSyncStatus =
  | 'anonymous'        // ★ nuovo stato
  | 'pending'
  | 'handshake'
  | 'loggedIn'
  | 'sessionExpired'
  | 'disconnected'
  | 'error';

@Injectable({ providedIn: 'root' })
export class SessionSyncService {

  private _status = signal<SessionSyncStatus>(
    localStorage.getItem('login') ? 'pending' : 'anonymous'
  );
  public readonly status = this._status.asReadonly();

  private handshakePending = false;
  private retries = 0;
  private readonly maxRetries = 5;
  private lastAnonHandshake = 0;
  private anonHandshakeCooldownMs = 5000;
  private anonCooldown = 5000;

  constructor(
    private readonly realtimeSocket: RealtimeSocketService,
    private readonly userContext: UserContextService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly zone: NgZone,
  ) {
    this.realtimeSocket.onConnect()
      .subscribe(() => {
        // handshake SOLO se:
        // - non c'è handshake in corso
        // - vogliamo fare resync perché reconnect reale (status 'disconnected' o 'loggedIn' / 'anonymous' dopo perdita)
        if (!this.handshakePending && (this._status() === 'pending' || this._status() === 'disconnected')) {
          this.zone.run(() => this.syncSession());
        }
      });

    /* Listeners prima di aprire la connessione */
    this.realtimeSocket.on('sv.pub.session_expired')
      .subscribe(() => this.zone.run(() => this.handleSessionExpired()));

    this.realtimeSocket.onConnect()
      .subscribe(() => this.zone.run(() => {
        // Handshake sempre: è lo “spec” richiesto
        this.syncSession();
      }));

    this.realtimeSocket.onDisconnect()
      .subscribe(reason => {
        if (reason === 'io client disconnect') return;
        this.zone.run(() => {
          if (this._status() !== 'sessionExpired') {
            this._status.set('disconnected');
            this.toast.trigger('Connessione persa. Riconnessione…', 'warn');
          }
        });
      });

    // Prima connessione (anonima o privata in base al token presente)
    this.realtimeSocket.connect();

    // Se la pagina parte già loggata (F5) -> handshake
    if (localStorage.getItem('login')) {
      this.syncSession();
    }

    // Cross-tab
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key !== 'login') return;
      if (e.newValue) {
        // login in un’altra tab => tenta handshake per diventare loggedIn qui
        this.resumeSession(e.newValue);
      } else {
        // logout in un’altra tab
        this.becomeAnonymous({ navigateIfProtected: true, showToast: true, fromStorage: true });
      }
    });
  }

  /* ───────────────────────────── Handshake ───────────────────────────── */
  public async syncSession(): Promise<void> {
    if (this.handshakePending) return;

    const loginPresent = !!localStorage.getItem('login');
    const now = Date.now();

    if (!loginPresent && now - this.lastAnonHandshake < this.anonCooldown) {
      if (this._status() !== 'anonymous') this._status.set('anonymous');
      return;
    }

    this.handshakePending = true;
    this._status.set('handshake');

    try {
      // connect idempotente
      if (loginPresent) this.realtimeSocket.ensurePrivate();
      else this.realtimeSocket.ensurePublic();

      if (!this.realtimeSocket.isConnected) {
        await new Promise(res => {
          const sub = this.realtimeSocket.onConnect().subscribe(() => { sub.unsubscribe(); res(null); });
          setTimeout(() => { sub.unsubscribe(); res(null); }, 4000);
        });
      }

      const ack = await this.realtimeSocket.emit('so.pub.session_init');
      if (ack?.detail === 'websocket session init successful') {
        const initials = localStorage.getItem('login') ?? 'U';
        this.userContext.setInitials(initials);
        localStorage.setItem('login', initials);
        this._status.set('loggedIn');
        this.retries = 0;
      } else {
        if (this._status() === 'loggedIn') {
          this.userContext.clearInitials();
          localStorage.removeItem('login');
        }
        this._status.set('anonymous');
        this.lastAnonHandshake = now;
      }
    } catch (e) {
      this._status.set('error');
    } finally {
      this.handshakePending = false;
    }
  }

  /* ─────────────────── Sessione scaduta (evento server) ─────────────────── */
  private handleSessionExpired(): void {
    const wasLoggedIn = this._status() === 'loggedIn';

    this._status.set('sessionExpired');
    this.userContext.clearInitials();
    localStorage.removeItem('login');

    // socket privata -> torna pubblica
    this.realtimeSocket.disconnect();
    this.realtimeSocket.connect();

    if (wasLoggedIn) {
      this.toast.trigger('Sessione scaduta. Effettua nuovamente il login.', 'error');
      this.router.navigate(['/login']);
    } else {
      // Se per qualche motivo arriva l’evento mentre sei anonimo, trattalo come anonimizzazione silenziosa
      this._status.set('anonymous');
    }
  }

  /* ───────────────────────────── Logout esplicito ───────────────────────────── */
  public logout({ silent = false, fromStorage = false } = {}): void {
    this.userContext.clearInitials();
    localStorage.removeItem('login');
    this._status.set('sessionExpired');

    this.realtimeSocket.disconnect();
    this.realtimeSocket.connect(); // pubblica

    if (!silent) {
      const msg = fromStorage ? 'Logout da un’altra scheda' : 'Logout eseguito.';
      this.toast.trigger(msg, 'success');
    }
    this.router.navigate(['/login']);
  }

  /* ───────────────────────────── Login / resume ───────────────────────────── */
  public async resumeSession(initials: string): Promise<void> {
    this.userContext.setInitials(initials);
    localStorage.setItem('login', initials);
    this._status.set('pending');     // passerà a loggedIn dopo handshake
    await this.syncSession();
  }

  /* ───────────────────────────── Helper anonimizzazione ───────────────────────────── */
  private becomeAnonymous(opts: {
    degradeFromLoggedIn?: boolean;
    navigateIfProtected?: boolean;
    showToast?: boolean;
    fromStorage?: boolean;
  } = {}) {
    const {
      degradeFromLoggedIn = false,
      navigateIfProtected = false,
      showToast = false,
      fromStorage = false
    } = opts;

    this.userContext.clearInitials();
    localStorage.removeItem('login');

    // Se stavi passando da loggedIn -> anonymous (per token scaduto / handshake fail)
    if (degradeFromLoggedIn && showToast) {
      this.toast.trigger('Accesso non più valido.', 'warn');
    }

    // Torna in modalità anonima
    this._status.set('anonymous');

    // Mantieni socket pubblica
    // Mantieni la socket esistente se il server non ti ha buttato fuori.
    // Se proprio vuoi garantire public, puoi solo fare “upgrade/downgrade”:
    if (this.realtimeSocket.isConnected) {
      // se la connessione era privata non serve per forza chiuderla, puoi lasciarla,
      // ma se il server rifiuterà eventi, li ignori. Se preferisci pulire:
      this.realtimeSocket.connect({ force: true, mode: 'public' });
    } else {
      this.realtimeSocket.connect({ mode: 'public' });
    }


    if (navigateIfProtected) {
      // Se la rotta corrente NON è pubblica, portalo a /login
      if (!this.isPublicRoute(this.router.url)) {
        this.router.navigate(['/login']);
      }
    }
  }

  /* Mappa delle route pubbliche (exact + prefix) */
  private readonly publicExact = ['/login', '/register', '/forgot', '/privacy', '/'];
  private readonly publicPrefixes = ['/molecules/detail'];

  private isPublicRoute(url: string): boolean {
    // togli query/hash
    const q = url.indexOf('?'); if (q >= 0) url = url.slice(0, q);
    const h = url.indexOf('#'); if (h >= 0) url = url.slice(0, h);
    return (
      this.publicExact.includes(url) ||
      this.publicPrefixes.some(p => url.startsWith(p))
    );
  }

  private waitForConnect(): Promise<void> {
    if (this.realtimeSocket.isConnected) return Promise.resolve();
    return new Promise(res => {
      const sub = this.realtimeSocket.onConnect().subscribe(() => {
        sub.unsubscribe();
        res();
      });
      // timeout di fallback se vuoi
      setTimeout(() => {
        if (!this.realtimeSocket.isConnected) res();
      }, 4000);
    });
  }


  /* API extra */
  public forceSessionCheck(): void { this.syncSession(); }
  public get currentStatus(): SessionSyncStatus { return this._status(); }



}
