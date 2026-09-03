/* ──────────────────────────────────────────────────────────────
 * RealtimeSocketService – public stabile, upgrade/downgrade safe
 * ────────────────────────────────────────────────────────────── */
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import {
  socketEventRegistry,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketApplicationError,
  type SocketSessionExpiredPayload,
  type SocketSessionInitAcknowledgement,
} from '@mercurion/socket-contracts';
import { AuthService } from '../auth.service';
import { JwtHelperService } from '../jwt-helper.service';
import { environment } from '../../../environments/environment.development';

export type SocketMode = 'public' | 'private';

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {

  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private mode: SocketMode = 'public';

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

    this.socket = io(environment.wsUrl, {
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

    this.socket.on('disconnect', async (reason) => {
      if (this.mode !== 'private') return;
      if (reason === 'io client disconnect') return;
      await this.ensureFreshToken(); // soft
    });

    this.socket.io.on('reconnect_attempt', async () => {
      if (this.mode !== 'private') return;
      await this.ensureFreshToken(); // soft
      const tok = this.auth.getWs_accessToken();
      if (tok && !this.jwt.isTokenExpired(tok)) {
        this.socket.auth = { token: tok };
        this.lastAuthTokenSent = tok;
      }
    });

    this.socket.on('connect_error', async (err) => {
      if (this.mode !== 'private') return;
      const errorCode = 'code' in err ? err.code : undefined;
      const isAuthErr = (errorCode === 'AUTH_EXPIRED') ||
        (typeof err?.message === 'string' && /auth|token/i.test(err.message));
      if (!isAuthErr) return;

      await this.ensureFreshToken(true); // <-- FORZA refresh
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
        this.socket.emit(socketEventRegistry.authRefresh.name, latest);
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
  async ensurePrivate(
    tokenOverride?: string,
    opts?: { forceRefresh?: boolean },
  ): Promise<void> {
    this.modeOp = this.modeOp.then(async () => {
      const wasPrivate = (this.mode === 'private');
      const forceRefresh = opts?.forceRefresh === true;

      // 1) assicuriamoci di avere un token WS valido
      let tok = tokenOverride ?? this.auth.getWs_accessToken();
      if (!tokenOverride) {
        await this.ensureFreshToken(forceRefresh);
        tok = this.auth.getWs_accessToken();
      }

      if (!tok || this.jwt.isTokenExpired(tok)) {
        // token non disponibile → fallback PUBLIC
        this.mode = 'public';
        this.socket.auth = {};
        this.lastAuthTokenSent = null;
        if (!this.socket.connected) this.safeConnect();
        return;
      }

      // 2) abbiamo un token valido → configuriamo auth per handshake
      this.mode = 'private';
      this.socket.auth = { token: tok };

      if (!this.socket.connected) {
        // non connesso → connettiti con auth
        this.lastAuthTokenSent = tok;
        this.safeConnect();
        return;
      }

      // 3) già connesso
      if (wasPrivate && this.lastAuthTokenSent === tok) {
        // stesso token → refresh soft opzionale lato server
        this.socket.emit(socketEventRegistry.authRefresh.name, tok);
        return;
      }

      // public -> private o token cambiato → serve reconnect
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
      this.socket.auth = {};
      this.lastAuthTokenSent = null;

      if (!this.socket.connected) {
        // non connesso → connettiti in public
        this.safeConnect();
        return;
      }

      if (wasPrivate) {
        // eri private → de-auth in-place, nessun reconnect
        this.socket.emit(socketEventRegistry.authRefresh.name, '');
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
      this.socket.auth = {};
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

  emitSessionInit(
    timeout = 5000,
  ): Promise<SocketSessionInitAcknowledgement | undefined> {
    return new Promise((res) => {
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; res(undefined); } }, timeout);
      try {
        this.socket.emit(socketEventRegistry.sessionInit.name, undefined, (ack) => {
          if (!settled) { settled = true; clearTimeout(timer); res(ack); }
        });
      } catch {
        if (!settled) { settled = true; clearTimeout(timer); res(undefined); }
      }
    });
  }

  /* ───────── Observable helper ───────── */

  onApplicationError(): Observable<SocketApplicationError> {
    return new Observable<SocketApplicationError>(observer => {
      const handler = (data: SocketApplicationError) => observer.next(data);
      this.socket.on(socketEventRegistry.applicationError.name, handler);
      return () => this.socket.off(socketEventRegistry.applicationError.name, handler);
    });
  }
  onSessionExpired(): Observable<SocketSessionExpiredPayload> {
    return new Observable<SocketSessionExpiredPayload>(observer => {
      const handler = (data: SocketSessionExpiredPayload) => observer.next(data);
      this.socket.on(socketEventRegistry.sessionExpired.name, handler);
      return () => this.socket.off(socketEventRegistry.sessionExpired.name, handler);
    });
  }
  onConnect(): Observable<void> {
    return new Observable<void>(observer => {
      const handler = () => observer.next();
      this.socket.on('connect', handler);
      return () => this.socket.off('connect', handler);
    });
  }
  onDisconnect(): Observable<string> {
    return new Observable<string>(observer => {
      const handler = (reason: string) => observer.next(reason);
      this.socket.on('disconnect', handler);
      return () => this.socket.off('disconnect', handler);
    });
  }

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
  /** Se force=true, forza il refresh anche se il JWT non risulta scaduto. */
  private async ensureFreshToken(force = false): Promise<void> {
    const tok = this.auth.getWs_accessToken();
    const needRefresh = force || !tok || this.jwt.isTokenExpired(tok);
    if (!needRefresh) return;
    await this.auth.refreshWsAccessTokenLocked().catch(() => null);
  }

}
