/* ──────────────────────────────────────────────────────────────
 * RealtimeSocketService – single-socket, JWT-aware, lock-safe
 * ────────────────────────────────────────────────────────────── */
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth.service';
import { JwtHelperService } from '../jwt-helper.service';

export type SocketMode = 'public' | 'private';

interface Listener<T = any> {
  event: string;
  handler: (payload: T) => void;
}

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {
  private readonly url = 'http://localhost:8888';
  private socket: Socket;
  private mode: SocketMode = 'public';
  private readonly listeners: Listener[] = [];

  // antirimbalzo connect()
  private connectInFlight = false;
  private lastConnectAt = 0;

  // serializza cambi di modalità (evita race ensurePrivate/ensurePublic sovrapposte)
  private modeOp: Promise<void> = Promise.resolve();

  // opzionale: attesa di stabilizzazione post-connect
  private stableDelayMs = 100;

  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtHelperService,
  ) {
    this.socket = io(this.url, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 8000,
      autoConnect: false,
    });

    // ——— Core listeners (no business logout qui) ———
    this.socket.on('disconnect', async (reason: Socket.DisconnectReason) => {
      // In private, prepariamo un token fresco per i prossimi attempt solo se scaduto
      if (this.mode !== 'private') return;
      if (reason === 'io client disconnect') return;
      await this.ensureFreshTokenIfExpired();
    });

    this.socket.on('reconnect_attempt', async () => {
      if (this.mode !== 'private') return;
      // ad ogni attempt carica token valido (refresh solo se scaduto)
      await this.ensureFreshTokenIfExpired();
      const tok = this.auth.getWs_accessToken();
      if (tok && !this.jwt.isTokenExpired(tok)) {
        this.socket.auth = { token: tok };
      }
    });

    this.socket.on('connect_error', async (err: any) => {
      if (this.mode !== 'private') return;
      const isAuthErr = (err?.code === 'AUTH_EXPIRED') ||
        (typeof err?.message === 'string' && /auth|token/i.test(err.message));
      if (!isAuthErr) return;
      await this.ensureFreshTokenIfExpired();
      const tok = this.auth.getWs_accessToken();
      if (tok && !this.jwt.isTokenExpired(tok)) {
        this.socket.auth = { token: tok };
        // niente this.socket.connect() qui: lascia gestire al backoff interno
      }
    });

    // cross-tab: se cambia il token ed è valido, invia auth_refresh live
    window.addEventListener('storage', (e) => {
      if (e.key !== 'ws_accessToken') return;
      if (this.mode !== 'private' || !this.socket.connected) return;
      const latest = this.auth.getWs_accessToken();
      if (latest && !this.jwt.isTokenExpired(latest)) {
        this.socket.auth = { token: latest };
        this.socket.emit('auth_refresh', latest);
      }
    });
  }

  /* ───────── API alto livello ───────── */

  /** Porta/lascia la connessione in modalità privata. Serializzato. */
  async ensurePrivate(): Promise<void> {
    this.modeOp = this.modeOp.then(async () => {
      this.mode = 'private';

      // 1) assicurati di avere un token valido (refresh solo se scaduto o assente)
      await this.ensureFreshTokenIfExpired();

      const tok = this.auth.getWs_accessToken();
      if (tok && !this.jwt.isTokenExpired(tok)) {
        this.socket.auth = { token: tok };
      } else {
        // nessun token valido → degrada a public per ora
        this.mode = 'public';
        delete (this.socket as any).auth;
      }

      // 2) se già connessi:
      if (this.socket.connected) {
        if (this.mode === 'private' && tok) {
          this.socket.emit('auth_refresh', tok);
        } else {
          this.socket.emit('auth_refresh', '');
        }
        return;
      }

      // 3) connetti (una sola volta)
      this.safeConnect();
    });

    return this.modeOp;
  }

  /** Porta/lascia la connessione in modalità pubblica. Serializzato. */
  async ensurePublic(): Promise<void> {
    this.modeOp = this.modeOp.then(async () => {
      this.mode = 'public';
      delete (this.socket as any).auth;

      if (this.socket.connected) {
        this.socket.emit('auth_refresh', '');
        return;
      }
      this.safeConnect();
    });
    return this.modeOp;
  }

  /** Forza la connessione usando la modalità corrente. */
  connect(mode: SocketMode = this.mode): void {
    if (mode === 'private') void this.ensurePrivate();
    else void this.ensurePublic();
  }

  disconnect(): void {
    this.socket.off();
    this.socket.disconnect();
  }

  get isConnected(): boolean { return this.socket.connected; }

  /** Promessa che si risolve quando siamo connessi, o dopo timeout. */
  async waitConnected(timeoutMs = 4000): Promise<boolean> {
    if (this.socket.connected) return true;
    return await new Promise<boolean>(res => {
      let done = false;
      const onConnect = () => { if (!done) { done = true; clearTimeout(timer); this.socket.off('connect', onConnect); res(true); } };
      this.socket.on('connect', onConnect);
      const timer = setTimeout(() => {
        if (!done) { done = true; this.socket.off('connect', onConnect); res(false); }
      }, timeoutMs);
    });
  }

  /** Piccola attesa per stabilizzazione post-connect (es. join room lato server). */
  async waitStable(): Promise<void> {
    await new Promise(r => setTimeout(r, this.stableDelayMs));
  }

  /* ───────── Emit con ACK ───────── */
  emit<T, R = any>(event: string, payload?: T, timeout = 5000): Promise<R | undefined> {
    return new Promise((res, rej) => {
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; res(undefined); } }, timeout);
      this.socket.emit(event, payload as any, (ack: R) => {
        if (!settled) { settled = true; clearTimeout(timer); res(ack); }
      });
    });
  }

  /* ───────── Observable helper ───────── */
  on<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      const handler = (d: T) => observer.next(d);
      this.listeners.push({ event, handler });
      this.socket.on(event, handler);

      return () => {
        const i = this.listeners.findIndex(l => l.event === event && l.handler === handler);
        if (i >= 0) this.listeners.splice(i, 1);
        this.socket.off(event, handler);
      };
    });
  }
  onConnect() { return this.on<void>('connect'); }
  onDisconnect() { return this.on<string>('disconnect'); }

  /* ───────── Interni ───────── */

  private safeConnect(): void {
    const now = Date.now();
    if (this.connectInFlight && (now - this.lastConnectAt) < 200) return;
    this.connectInFlight = true;
    this.lastConnectAt = now;
    try { this.socket.connect(); }
    finally { setTimeout(() => { this.connectInFlight = false; }, 50); }
  }

  /** Se il token è assente o scaduto, prova a rinfrescarlo con lock cross-tab. */
  private async ensureFreshTokenIfExpired(): Promise<void> {
    const tok = this.auth.getWs_accessToken();
    const needRefresh = !tok || this.jwt.isTokenExpired(tok);
    if (!needRefresh) return;

    const fresh = await this.auth.refreshWsAccessTokenLocked().catch(() => null);
    if (!fresh) return; // resterà public finché non disponibile
  }
}
