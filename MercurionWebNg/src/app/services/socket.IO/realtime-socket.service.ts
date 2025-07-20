import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

export type Listener<T = any> = { event: string; handler: (payload: T) => void };
export type SocketMode = 'public' | 'private';
export interface ConnectOpts {
  /** default: this.mode  */
  mode?: SocketMode;
  /** forza la ri-creazione anche se già connessi nello stesso mode */
  force?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {

  private socket?: Socket;
  private readonly listeners: Listener[] = [];

  /** flag usato solo per sapere se c’è un handshake in corso */
  private isConnecting = false;

  private mode: SocketMode = 'public';

  constructor(private readonly auth: AuthService) { }

  /** wrapper 1-1: chiama sempre `connect({mode:'private',force:true})` */
  ensurePrivate() { this.connect({ mode: 'private', force: true }); }

  /** wrapper 1-1: chiama sempre `connect({mode:'public',force:true})`  */
  ensurePublic() { this.connect({ mode: 'public', force: true }); }

  /* ======================================================================= */

  /** un’unica entry-point: opzionale `mode` + `force`                       */
 connect(opts: ConnectOpts = {}): void {
    const wanted = opts.mode ?? this.mode;
    if (!opts.force && this.socket?.connected && wanted === this.mode) return;

    /* 1️⃣ chiudi la precedente */
    this.socket?.off();
    this.socket?.disconnect();

    /* 2️⃣ crea la nuova */
    this.mode  = wanted;
    const token = this.mode === 'private'
      ? this.auth.getWs_accessToken?.() ?? undefined
      : undefined;

    this.socket = io('http://localhost:8888', {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      auth: { token },
    });

    /* 3️⃣ ***RI-AGGANCIA*** tutti gli handler già registrati */
    for (const { event, handler } of this.listeners) {
      this.socket.on(event, handler);
    }
  }

  disconnect(): void {
    this.socket?.off();
    this.socket?.disconnect();
    this.socket = undefined;
  }

  /* ------------------------------------------------------------------ */
  /* Emit con ACK (Promise): */
  public emit<T, R = any>(event: string, payload?: T, timeout = 5000): Promise<R | undefined> {
    if (!this.socket) return Promise.reject('Socket non connessa');
    return new Promise(resolve => {
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; resolve(undefined); } }, timeout);
      this.socket!.emit(event, payload, (ack: R) => {
        if (!settled) { settled = true; clearTimeout(timer); resolve(ack); }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Helpers di subscription: */
  /* -------------------- SUBSCRIPTION HELPER -------------------- */
  on<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      if (!this.socket) this.connect();          // crea se serve
      const handler = (data: T) => observer.next(data);
      this.socket!.on(event, handler);

      /* salva per i reconnect futuri */
      this.listeners.push({ event, handler });

      return () => {
        this.socket?.off(event, handler);
        const i = this.listeners.findIndex(l => l.event === event && l.handler === handler);
        if (i >= 0) this.listeners.splice(i, 1);
      };
    });
  }

  public onConnect() { return this.on<void>('connect'); }
  public onDisconnect() { return this.on<string>('disconnect'); }

  /* ------------------------------------------------------------------ */
  get isConnected(): boolean { return !!this.socket?.connected; }

  private _connect(mode: 'public' | 'private') {
    /* …close & create come già definito… */

    // ➌ dopo aver creato la nuova socket, ri-aggancia tutti i listener registrati
    for (const { event, handler } of this.listeners) {
      this.socket?.on(event, handler);
    }
  }

}
