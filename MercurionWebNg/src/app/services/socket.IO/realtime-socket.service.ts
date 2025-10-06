import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, of, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth.service';

export type SocketMode = 'public' | 'private';

interface Listener<T = any> {
  event: string;
  handler: (payload: T) => void;
}

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {
  private socket?: Socket;
  private mode: SocketMode = 'public';
  private readonly listeners: Listener[] = [];

  constructor(private readonly auth: AuthService) {
    // Cross-tab: se cambia il token, aggiorna auth in-place
    window.addEventListener('storage', (e) => {
      if (e.key !== 'ws_accessToken') return;
      if (this.mode !== 'private' || !this.socket?.connected) return;
      const latest = this.auth.getWs_accessToken();
      if (latest) {
        this.socket.auth = { token: latest };
        this.socket.emit('auth_refresh', latest);
      }
    });
  }

  /* ───────── API alto livello ───────── */

  ensurePrivate(token = this.auth.getWs_accessToken() ?? ''): void {
    this.setMode('private', token);
  }

  ensurePublic(): void { this.setMode('public'); }

  connect(mode: SocketMode = this.mode): void { this.setMode(mode); }

  disconnect(): void {
    this.socket?.off();
    this.socket?.disconnect();
    this.socket = undefined;
  }

  get isConnected(): boolean { return !!this.socket?.connected; }

  /* ───────── Emit con ACK ───────── */

  emit<T, R = any>(event: string, payload?: T, timeout = 5_000): Promise<R | undefined> {
    if (!this.socket) return Promise.reject('socket not connected');
    return new Promise(res => {
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; res(undefined); } }, timeout);
      this.socket!.emit(event, payload, (ack: R) => {
        if (!settled) { settled = true; clearTimeout(timer); res(ack); }
      });
    });
  }

  /* ───────── Observable helper ───────── */

  on<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      if (!this.socket) this.setMode(this.mode);  // autoconnect
      const handler = (d: T) => observer.next(d);
      this.socket!.on(event, handler);
      this.listeners.push({ event, handler });

      return () => {
        this.socket?.off(event, handler);
        const i = this.listeners.findIndex(l => l.event === event && l.handler === handler);
        if (i >= 0) this.listeners.splice(i, 1);
      };
    });
  }

  onConnect() { return this.on<void>('connect'); }
  onDisconnect() { return this.on<string>('disconnect'); }

  /* ───────── IMPLEMENTAZIONE ───────── */

  private setMode(mode: SocketMode, token?: string): void {
    // se siamo già connessi nella modalità giusta → refresh in-place
    if (this.socket?.connected && mode === this.mode) {
      if (mode === 'private') {
        const latest = this.auth.getWs_accessToken();
        if (latest) {
          this.socket.auth = { token: latest };
          this.socket.emit('auth_refresh', latest);
        }
      }
      return;
    }

    this.mode = mode;
    this.recreateSocket(token);
  }

  /** Se serve un token e non c’è, prova a rinfrescarlo prima di connettere. */
  private async ensureTokenIfNeeded(requested?: string): Promise<string | undefined> {
    if (this.mode !== 'private') return undefined;

    const fromStorage = this.auth.getWs_accessToken();
    if (requested || fromStorage) return requested ?? fromStorage ?? undefined;

    // Token assente → prova refresh
    try {
      const fresh = await firstValueFrom(this.auth.refreshWs_accessToken());
      return fresh;
    } catch {
      return undefined;
    }
  }

  private recreateSocket(token?: string): void {
    this.socket?.off();
    this.socket?.disconnect();

    // wrapper async “fire & forget” per rispettare la firma void
    (async () => {
      const t = await this.ensureTokenIfNeeded(token);

      this.socket = io('http://localhost:8888', {
        path: '/socket.io',
        transports: ['websocket'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2_000,
        reconnectionDelayMax: 8_000,
        // auth sempre letto da localStorage (o da t se presente ora)
        auth: this.mode === 'private' && (t ?? this.auth.getWs_accessToken())
          ? { token: t ?? this.auth.getWs_accessToken()! }
          : undefined
      });

      // Ri-attacca i listener applicativi
      for (const { event, handler } of this.listeners) {
        this.socket.on(event, handler);
      }

      // Prima di ogni attempt, ricarica token da localStorage (e refresh se mancante)
      this.socket.on('reconnect_attempt', async () => {
        if (this.mode !== 'private') return;
        const latest = this.auth.getWs_accessToken();
        if (latest) {
          this.socket!.auth = { token: latest };
          return;
        }
        // token assente → prova refresh rapido
        try {
          const fresh = await firstValueFrom(this.auth.refreshWs_accessToken());
          this.socket!.auth = { token: fresh };
        } catch { /* lascio gestire al ciclo di reconnect */ }
      });

      // Handshake fallito per auth → refresh e retry immediato
      this.socket.on('connect_error', async (err: any) => {
        if (!this.isAuthError(err) || this.mode !== 'private') return;
        const fresh = await this.safeRefresh();
        if (fresh) {
          this.socket!.auth = { token: fresh };
          if (!this.socket!.active) this.socket!.connect();
        }
      });

      // Disconnessione server per token scaduto → refresh e lascia ripartire il reconnector già aggiornato
      this.socket.on('disconnect', async (reason: string) => {
        if (this.mode !== 'private') return;
        if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'AUTH_EXPIRED') {
          const fresh = await this.safeRefresh();
          if (fresh) this.socket!.auth = { token: fresh };
        }
      });
    })();
  }

  private isAuthError(err: any): boolean {
    return !!(err && (
      err.message?.toLowerCase?.().includes('auth') ||
      err.message?.toLowerCase?.().includes('token') ||
      err?.code === 401 ||
      err?.code === 'AUTH_EXPIRED'
    ));
  }

  private async safeRefresh(): Promise<string | undefined> {
    try {
      const fresh = await firstValueFrom(
        this.auth.refreshWs_accessToken().pipe(catchError(() => of(null as any)))
      );
      return fresh ?? undefined;
    } catch { return undefined; }
  }
}
