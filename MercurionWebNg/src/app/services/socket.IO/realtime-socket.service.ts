import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

export type Mode = 'public' | 'private';

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {

  private socket: Socket | undefined;
  private listeners = new Map<string, Set<(...a: any) => void>>();
  private currentMode: Mode | null = null;
  private currentToken: string | undefined;
  private connecting = false;          // lock
  private queuedConnect = false;       // ripeti se richiesto durante lock

  constructor(private readonly auth: AuthService) { }

  /* ---------- Public helpers ---------- */
  public ensurePublic() { this.connect({ mode: 'public' }); }
  public ensurePrivate() { this.connect({ mode: 'private' }); }

  /* ---------- Core connect (idempotente) ---------- */
  public connect(opts?: { force?: boolean; mode?: Mode }) {
    const requestedMode: Mode =
      opts?.mode ?? (this.auth.getWs_accessToken() ? 'private' : 'public');
    const token = requestedMode === 'private'
      ? (this.auth.getWs_accessToken() ?? undefined)
      : undefined;
    const force = !!opts?.force;

    if (this.connecting) {
      // c'è già un connect in corso: accoda una sola ripetizione se davvero force/mode diverso
      if (force || requestedMode !== this.currentMode) this.queuedConnect = true;
      return;
    }

    // Idempotenza: se già ok e non forzi → esci
    if (!force &&
      this.socket?.connected &&
      this.currentMode === requestedMode &&
      this.currentToken === token) {
      return;
    }

    this.connecting = true;

    // Chiudi solo se serve
    if (this.socket) {
      this.socket.off();
      this.socket.disconnect();
    }

    this.socket = io('http://localhost:8888', {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      randomizationFactor: 0.5
    });

    this.currentMode = requestedMode;
    this.currentToken = token;

    // Ri-bind listener (senza duplicarli)
    for (const [event, set] of this.listeners.entries()) {
      for (const handler of set) {
        this.socket.on(event, handler);
      }
    }

    this.socket.on('connect', () => {
      this.connecting = false;
      if (this.queuedConnect) {
        this.queuedConnect = false;
        // revalida mode/token (può essere cambiato nel frattempo)
        this.connect({ mode: this.currentMode ?? requestedMode, force: false });
      }
    });

    this.socket.on('connect_error', err => {
      // Sblocca il lock per poter riprovare; socket.io penserà al backoff
      this.connecting = false;
    });

    this.socket.on('disconnect', () => {
      // NON azzerare listeners; li teniamo e verranno ri-agganciati alla prossima connect
    });

  }

  public disconnect() {
    this.connecting = false;
    this.queuedConnect = false;
    this.socket?.off();
    this.socket?.disconnect();
    this.socket = undefined;
    this.currentMode = null;
    this.currentToken = undefined;
  }

  private addListener(event: string, handler: (...a: any) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  /* ---------- Emit / On ---------- */
  public emit<T, R = any>(event: string, payload?: T, timeout = 5000): Promise<R> {
    if (!this.socket) return Promise.reject('Socket non connesso');
    return new Promise<R>(resolve => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) { settled = true; resolve(undefined as R); }
      }, timeout);
      this.socket!.emit(event, payload, (ack: R) => {
        if (!settled) {
          clearTimeout(timer);
          settled = true;
          resolve(ack);
        }
      });
    });
  }

  public on<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      const handler = (data: T) => observer.next(data);
      this.addListener(event, handler);
      if (this.socket) this.socket.on(event, handler);
      return () => {
        this.listeners.get(event)?.delete(handler);
        this.socket?.off(event, handler);
      };
    });
  }

  public onConnect(): Observable<void> { return this.on<void>('connect'); }
  public onDisconnect(): Observable<string> {
    return new Observable<string>(observer => {
      const h = (reason: string) => observer.next(reason);
      this.addListener('disconnect', h);
      if (this.socket) this.socket.on('disconnect', h);
      return () => {
        this.listeners.get('disconnect')?.delete(h);
        this.socket?.off('disconnect', h);
      };
    });
  }

  public get isConnected(): boolean {
    return !!this.socket?.connected;
  }
}
