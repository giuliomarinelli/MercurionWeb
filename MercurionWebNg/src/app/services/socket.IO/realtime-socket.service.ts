/* ──────────────────────────────────────────────────────────────
 * RealtimeSocketService – public stabile, upgrade/downgrade safe
 * ────────────────────────────────────────────────────────────── */
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
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

  // evita spam di connect()
  private connectInFlight = false;
  private lastConnectAt = 0;

  // serializza transizioni (evita race ensurePrivate/ensurePublic sovrapposte)
  private modeOp: Promise<void> = Promise.resolve();

  // traccia l’ultimo token “mandato” in auth per evitare reconnect inutili
  private lastAuthTokenSent: string | null = null;

  // piccolo delay per stabilizzazione post-connect (join server room, ecc.)
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

    // ——— Core listeners ———
    this.socket.on('connect', () => {
      this.lastAuthTokenSent = (this.mode === 'private')
        ? (this.auth.getWs_accessToken() ?? null)
        : null;
    });

    this.socket.on('disconnect', async (reason: any) => {
      if (this.mode !== 'private') return;
      if (reason === 'io client disconnect') return;
      await this.ensureFreshTokenIfExpired();
    });

    this.socket.on('reconnect_attempt', async () => {
      if (this.mode !== 'private') return;
      await this.ensureFreshTokenIfExpired();
      const tok = this.auth.getWs_accessToken();
      if (tok && !this.jwt.isTokenExpired(tok)) {
        this.socket.auth = { token: tok };
        this.lastAuthTokenSent = tok;
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
        this.lastAuthTokenSent = tok;
      }
    });

    // cross-tab: se cambia il token ed è valido, aggiorna in-place (nessun reconnect)
    window.addEventListener('storage', (e) => {
      if (e.key !== 'ws_accessToken') return;
      if (this.mode !== 'private' || !this.socket.connected) return;
      const latest = this.auth.getWs_accessToken();
      if (latest && !this.jwt.isTokenExpired(latest)) {
        this.socket.auth = { token: latest };
        this.lastAuthTokenSent = latest;
        this.socket.emit('auth_refresh', latest);
      }
    });
  }

  /* ───────── API alto livello ───────── */

  getMode(): SocketMode { return this.mode; }

  /**
   * Entra/rimani in modalità privata.
   * - Se sei connesso in public: **reconnect** con token in handshake (upgrade).
   * - Se sei già private e il token non è cambiato: solo `auth_refresh(token)` (no reconnect).
   * - Se token assente/scaduto: resta/torna public e connettiti (no loop).
   */
  async ensurePrivate(tokenOverride?: string): Promise<void> {
    this.modeOp = this.modeOp.then(async () => {
      const wasPrivate = (this.mode === 'private');

      // 1) assicurati di avere token valido (refresh solo se necessario)
      let tok = tokenOverride ?? this.auth.getWs_accessToken();
      if (!tokenOverride) {
        await this.ensureFreshTokenIfExpired();
        tok = this.auth.getWs_accessToken();
      }

      if (!tok || this.jwt.isTokenExpired(tok)) {
        // token non disponibile: non puoi essere private → rimani/torna public
        this.mode = 'public';
        delete (this.socket as any).auth;
        this.lastAuthTokenSent = null;
        if (!this.socket.connected) this.safeConnect();
        return;
      }

      // 2) abbiamo token valido → imposta auth per handshake/attempt successivi
      this.mode = 'private';
      this.socket.auth = { token: tok };

      if (!this.socket.connected) {
        // 3a) non connesso → connettiti con auth
        this.lastAuthTokenSent = tok;
        this.safeConnect();
        return;
      }

      // 3b) già connesso
      if (wasPrivate && this.lastAuthTokenSent === tok) {
        // già private con lo stesso token: niente reconnect, solo refresh soft
        this.socket.emit('auth_refresh', tok);
        return;
      }

      // public -> private (upgrade) OPPURE token diverso → serve reconnect con handshake
      this.lastAuthTokenSent = tok;
      this.reconnectWithCurrentAuth();
    });
    return this.modeOp;
  }

  /**
   * Entra/rimani in modalità pubblica.
   * - Se eri private: **de-auth in-place**, nessun reconnect.
   * - Se sei già public e connesso: **NO-OP**.
   */
  async ensurePublic(): Promise<void> {
    this.modeOp = this.modeOp.then(async () => {
      const wasPrivate = (this.mode === 'private');

      this.mode = 'public';
      delete (this.socket as any).auth;
      this.lastAuthTokenSent = null;

      if (!this.socket.connected) {
        // non connesso → connettiti in public
        this.safeConnect();
        return;
      }

      if (wasPrivate) {
        // eri private → de-auth in-place, nessun reconnect
        this.socket.emit('auth_refresh', '');
        return;
      }

      // già public + connessi → NO-OP
      return;
    });
    return this.modeOp;
  }

  /** Downgrade immediato a PUBLIC con reconnect forzato (logout/scadenza). */
  async reconnectPublicNow(): Promise<void> {
    this.modeOp = this.modeOp.then(async () => {
      this.mode = 'public';
      delete (this.socket as any).auth;
      this.lastAuthTokenSent = null;
      this.reconnectWithCurrentAuth();
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

  /** Attende connessione o timeout. */
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

  async waitStable(): Promise<void> {
    await new Promise(r => setTimeout(r, this.stableDelayMs));
  }

  /* ───────── Emit con ACK ───────── */

  emit<T, R = any>(event: string, payload?: T, timeout = 5000): Promise<R | undefined> {
    return new Promise((res) => {
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; res(undefined); } }, timeout);
      try {
        this.socket.emit(event, payload as any, (ack: R) => {
          if (!settled) { settled = true; clearTimeout(timer); res(ack); }
        });
      } catch {
        if (!settled) { settled = true; clearTimeout(timer); res(undefined); }
      }
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

  /** Reconnect atomico con l'`auth` già impostata (o rimossa). */
  private reconnectWithCurrentAuth(): void {
    this.socket.disconnect();
    queueMicrotask(() => this.safeConnect());
  }

  /** Se il token è assente o scaduto, prova a rinfrescarlo con lock cross-tab. */
  private async ensureFreshTokenIfExpired(): Promise<void> {
    const tok = this.auth.getWs_accessToken();
    const needRefresh = !tok || this.jwt.isTokenExpired(tok);
    if (!needRefresh) return;
    await this.auth.refreshWsAccessTokenLocked().catch(() => null);
  }
}
