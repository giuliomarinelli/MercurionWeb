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

    this.socket.on('connect', () => {
      this.lastAuthTokenSent = (this.mode === 'private') ? (this.auth.getWs_accessToken() ?? null) : null;
    });

    this.socket.on('disconnect', async (reason: Socket.DisconnectReason) => {
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

  getMode(): SocketMode { return this.mode; }

  async ensurePrivate(): Promise<void> {
    this.modeOp = this.modeOp.then(async () => {
      const wasPrivate = (this.mode === 'private');

      await this.ensureFreshTokenIfExpired();
      const tok = this.auth.getWs_accessToken();
      if (!tok || this.jwt.isTokenExpired(tok)) {
        this.mode = 'public';
        delete (this.socket as any).auth;
        this.lastAuthTokenSent = null;
        if (!this.socket.connected) this.safeConnect();
        return;
      }

      this.mode = 'private';
      this.socket.auth = { token: tok };

      if (!this.socket.connected) {
        this.lastAuthTokenSent = tok;
        this.safeConnect();
        return;
      }

      if (wasPrivate && this.lastAuthTokenSent === tok) {
        this.socket.emit('auth_refresh', tok);
        return;
      }

      this.lastAuthTokenSent = tok;
      this.reconnectWithCurrentAuth();
    });
    return this.modeOp;
  }

  async ensurePublic(): Promise<void> {
    this.modeOp = this.modeOp.then(async () => {
      const wasPrivate = (this.mode === 'private');

      this.mode = 'public';
      delete (this.socket as any).auth;
      this.lastAuthTokenSent = null;

      if (!this.socket.connected) {
        this.safeConnect();
        return;
      }

      if (wasPrivate) {
        this.socket.emit('auth_refresh', '');
        return;
      }
      return;
    });
    return this.modeOp;
  }

  connect(mode: SocketMode = this.mode): void {
    if (mode === 'private') void this.ensurePrivate();
    else void this.ensurePublic();
  }

  disconnect(): void {
    this.socket.off();
    this.socket.disconnect();
  }

  get isConnected(): boolean { return this.socket.connected; }

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

  private safeConnect(): void {
    const now = Date.now();
    if (this.connectInFlight && (now - this.lastConnectAt) < 200) return;
    this.connectInFlight = true;
    this.lastConnectAt = now;
    try { this.socket.connect(); }
    finally { setTimeout(() => { this.connectInFlight = false; }, 50); }
  }

  private reconnectWithCurrentAuth(): void {
    this.socket.disconnect();
    queueMicrotask(() => this.safeConnect());
  }

  private async ensureFreshTokenIfExpired(): Promise<void> {
    const tok = this.auth.getWs_accessToken();
    const needRefresh = !tok || this.jwt.isTokenExpired(tok);
    if (!needRefresh) return;
    await this.auth.refreshWsAccessTokenLocked().catch(() => null);
  }
}
