/* ──────────────────────────────────────────────────────────────
 * RealtimeSocketService – public stabile, upgrade/downgrade safe
 * ────────────────────────────────────────────────────────────── */
import { inject, Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { signal } from '@angular/core';
import {
  socketEventRegistry,
  SOCKET_CONTRACT_MAJOR,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SocketApplicationError,
  type SocketSessionExpiredPayload,
  type SocketSessionInitAcknowledgement,
} from '@mercurion/socket-contracts';
import { AuthService } from '../auth.service';
import { JwtHelperService } from '../jwt-helper.service';
import { APP_CONFIG } from '../../config/app-config';
import {
  ApplicationErrorCode,
  hasApplicationErrorCode
} from '../../utils/application-error.util';
import {
  DEFAULT_REALTIME_RETRY_POLICY,
  reduceRealtimeConnection,
  retryDelay,
  type RealtimeConnectionState,
} from './realtime-connection-state-machine';

export type SocketMode = 'public' | 'private';

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService implements OnDestroy {

  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private mode: SocketMode = 'public';
  private readonly _state = signal<RealtimeConnectionState>({ kind: 'disconnected', mode: 'public' });
  readonly state = this._state.asReadonly();
  private generation = 0;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private retryAttempt = 0;
  private stopped = false;

  private readonly appConfig = inject(APP_CONFIG);

  // serializza transizioni (evita race ensurePrivate/ensurePublic sovrapposte)
  private modeOp: Promise<void> = Promise.resolve();

  // traccia l’ultimo token “mandato” in auth per evitare reconnect inutili
  private lastAuthTokenSent: string | null = null;

  // piccolo delay per stabilizzazione post-connect (join server room, ecc.)
  private stableDelayMs = 100;

  /**
   * Ownership: these four handlers belong to the application/socket instance.
   * Feature and session observers are registered by the Observable factories
   * below and own only their exact handler until unsubscribe.
   */
  private readonly onConnectCore = () => {
    this.retryAttempt = 0;
    this._state.set(reduceRealtimeConnection(this._state(), { type: 'transport-connected' }));
    this.lastAuthTokenSent = this.mode === 'private'
      ? (this.auth.getWs_accessToken() ?? null)
      : null;
  };

  private readonly onDisconnectCore = (reason: string) => {
    if (reason === 'io client disconnect' || this.stopped) return;
    this.scheduleRetry();
  };

  private readonly onConnectErrorCore = async (err: unknown) => {
    const isAuthErr =
      hasApplicationErrorCode(err, ApplicationErrorCode.ACCESS_TOKEN_INVALID_OR_EXPIRED) ||
      hasApplicationErrorCode(err, ApplicationErrorCode.AUTHENTICATION_UNAUTHORIZED)
    if (isAuthErr && this.mode === 'private') {
      await this.ensureFreshToken(true);
      if (this.generation !== this.currentGeneration()) return;
      const tok = this.auth.getWs_accessToken();
      if (tok && !this.jwt.isTokenExpired(tok)) this.socket.auth = { token: tok, contractMajor: SOCKET_CONTRACT_MAJOR };
    }
    if (!this.stopped) this.scheduleRetry();
  };

  private readonly onStorage = (e: StorageEvent): void => {
    if (e.key !== 'ws_accessToken') return;
    if (this.mode !== 'private' || !this.socket.connected) return;
    const latest = this.auth.getWs_accessToken();
    if (latest && !this.jwt.isTokenExpired(latest)) {
      this.socket.auth = { token: latest, contractMajor: SOCKET_CONTRACT_MAJOR };
      this.lastAuthTokenSent = latest;
      this.socket.emit(socketEventRegistry.authRefresh.name, latest);
    }
  };

  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtHelperService,
  ) {

    this.socket = io(this.appConfig.endpoints.realtimeUrl, {
      path: this.appConfig.endpoints.realtimePath,
      transports: ['websocket'],
      withCredentials: true,
      reconnection: false,
      autoConnect: false,
    });

    // ——— Core listeners ———
    this.socket.on('connect', this.onConnectCore);
    this.socket.on('disconnect', this.onDisconnectCore);
    this.socket.on('connect_error', this.onConnectErrorCore);

    // cross-tab: se cambia il token ed è valido, aggiorna in-place (nessun reconnect)
    window.addEventListener('storage', this.onStorage);
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
    const requestedGeneration = ++this.generation;
    this.cancelRetry();
    this.stopped = false;
    this.modeOp = this.modeOp.then(async () => {
      const myGeneration = requestedGeneration;
      const wasPrivate = (this.mode === 'private');
      const forceRefresh = opts?.forceRefresh === true;

      // 1) assicuriamoci di avere un token WS valido
      let tok = tokenOverride ?? this.auth.getWs_accessToken();
      if (!tokenOverride) {
        await this.ensureFreshToken(forceRefresh);
        tok = this.auth.getWs_accessToken();
      }

      if (this.generation !== myGeneration) return;
      if (!tok || this.jwt.isTokenExpired(tok)) {
        // token non disponibile → fallback PUBLIC
        this.mode = 'public';
        this._state.set(reduceRealtimeConnection(this._state(), { type: 'connect-public' }));
        this.socket.auth = { contractMajor: SOCKET_CONTRACT_MAJOR };
        this.lastAuthTokenSent = null;
        if (!this.socket.connected) this.safeConnect();
        return;
      }

      // 2) abbiamo un token valido → configuriamo auth per handshake
      this.mode = 'private';
      this._state.set(reduceRealtimeConnection(this._state(), { type: 'connect-private' }));
      this.socket.auth = { token: tok, contractMajor: SOCKET_CONTRACT_MAJOR };

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
    const requestedGeneration = ++this.generation;
    this.cancelRetry();
    this.stopped = false;
    this.modeOp = this.modeOp.then(async () => {
      if (requestedGeneration !== this.generation) return;
      const wasPrivate = (this.mode === 'private');

      this.mode = 'public';
      this._state.set(reduceRealtimeConnection(this._state(), { type: 'connect-public' }));
      this.socket.auth = { contractMajor: SOCKET_CONTRACT_MAJOR };
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
    const requestedGeneration = ++this.generation;
    this.cancelRetry();
    this.stopped = false;
    this.modeOp = this.modeOp.then(async () => {
      if (requestedGeneration !== this.generation) return;
      this.mode = 'public';
      this._state.set(reduceRealtimeConnection(this._state(), { type: 'connect-public' }));
      this.socket.auth = { contractMajor: SOCKET_CONTRACT_MAJOR };
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
    this.stopped = true;
    this.cancelRetry();
    ++this.generation;
    this._state.set({ kind: 'stopped' });
    this.socket.disconnect();
  }

  /**
   * Application/socket ownership ends here. Do not use socket.off() without a
   * handler: that would remove feature/session observers owned elsewhere.
   */
  ngOnDestroy(): void {
    this.stopped = true;
    this.cancelRetry();
    ++this.generation;
    window.removeEventListener('storage', this.onStorage);
    this.socket.off('connect', this.onConnectCore);
    this.socket.off('disconnect', this.onDisconnectCore);
    this.socket.off('connect_error', this.onConnectErrorCore);
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
    if (this.stopped) return;
    if (!this.socket.connected) this.socket.connect();
  }

  /** Reconnect atomico con l'`auth` già impostata (o rimossa). */
  private reconnectWithCurrentAuth(): void {
    this.socket.disconnect();
    queueMicrotask(() => this.safeConnect());
  }

  private scheduleRetry(): void {
    const next = reduceRealtimeConnection(this._state(), { type: 'transport-disconnected' });
    if (next.kind === 'degraded') {
      this._state.set(next);
      return;
    }
    if (next.kind !== 'reconnecting') return;
    this.retryAttempt = next.attempt;
    const delay = retryDelay(next.attempt, DEFAULT_REALTIME_RETRY_POLICY);
    const retryAt = Date.now() + delay;
    this._state.set({ ...next, retryAt });
    this.cancelRetry();
    const myGeneration = this.generation;
    this.retryTimer = setTimeout(() => {
      if (myGeneration !== this.generation || this.stopped) return;
      this._state.set(reduceRealtimeConnection(this._state(), { type: 'retry', now: Date.now() }));
      if (this.mode === 'private') void this.ensurePrivate();
      else void this.ensurePublic();
    }, delay);
  }

  private cancelRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
  }

  private currentGeneration(): number { return this.generation; }

  /** Se il token è assente o scaduto, prova a rinfrescarlo con lock cross-tab. */
  /** Se force=true, forza il refresh anche se il JWT non risulta scaduto. */
  private async ensureFreshToken(force = false): Promise<void> {
    const tok = this.auth.getWs_accessToken();
    const needRefresh = force || !tok || this.jwt.isTokenExpired(tok);
    if (!needRefresh) return;
    await this.auth.refreshWsAccessTokenLocked().catch(() => null);
  }

}
