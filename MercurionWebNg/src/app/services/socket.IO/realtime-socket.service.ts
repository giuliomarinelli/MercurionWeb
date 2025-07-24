/* ──────────────────────────────────────────────────────────────
 *  RealtimeSocketService  – gestione singola connessione socket.io
 * ────────────────────────────────────────────────────────────── */

import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

export type SocketMode = 'public' | 'private';

/* listener registrati in runtime da altri service/component */
interface Listener<T = any> {
  event   : string;
  handler : (payload: T) => void;
}

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {

  /* ───── stato interno ───── */
  private socket?: Socket;
  private mode: SocketMode = 'public';

  private readonly listeners: Listener<any>[] = [];   // registry unico

  constructor(private readonly auth: AuthService) { }

  /* ============================================================
   *  API  – gestite “mode” e reconnessione unica
   * ============================================================
   */

  /** assicura la modalità *privata* (con token) */
  ensurePrivate(token = this.auth.getWs_accessToken?.() ?? ''): void {
    this.setMode('private', token);
  }

  /** assicura la modalità *pubblica* */
  ensurePublic(): void {
    this.setMode('public');
  }

  /** accesso legacy (es. da on<T>): ridirige a setMode */
  connect(mode: SocketMode = this.mode): void {
    this.setMode(mode);
  }

  /** chiude esplicitamente la connessione */
  disconnect(): void {
    this.socket?.off();
    this.socket?.disconnect();
    this.socket = undefined;
  }

  /** stato attuale */
  get isConnected(): boolean {
    return !!this.socket?.connected;
  }

  /* ============================================================
   *  Emit con ACK  (promessa che si risolve anche su timeout)
   * ============================================================
   */
  emit<T, R = unknown>(event: string, payload?: T, timeout = 5000): Promise<R | undefined> {
    if (!this.socket) return Promise.reject('Socket non connessa');
    return new Promise(resolve => {
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; resolve(undefined); } }, timeout);

      this.socket!.emit(event, payload, (ack: R) => {
        if (!settled) { settled = true; clearTimeout(timer); resolve(ack); }
      });
    });
  }

  /* ============================================================
   *  Helpers di subscription – Observable<T>
   * ============================================================
   */
  on<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {

      /* se la socket non esiste la creo in modalità corrente */
      if (!this.socket) this.setMode(this.mode);

      const handler = (data: T) => observer.next(data);
      this.socket!.on(event, handler);

      /* registra per i futuri reconnect */
      this.listeners.push({ event, handler });

      /* teardown */
      return () => {
        this.socket?.off(event, handler);
        const idx = this.listeners.findIndex(l => l.event === event && l.handler === handler);
        if (idx >= 0) this.listeners.splice(idx, 1);
      };
    });
  }

  /* shortcut tipizzati */
  onConnect()    { return this.on<void>('connect'); }
  onDisconnect() { return this.on<string>('disconnect'); }

  /* ============================================================
   *              —— IMPLEMENTAZIONE INTERNA ——
   * ============================================================
   */

  /** decide se ri‑connettere o solo aggiornare il token */
  private setMode(mode: SocketMode, token?: string): void {

    /* caso ➊: già connessi nello stesso mode ------------------ */
    if (this.socket?.connected && mode === this.mode) {

      /* se privato + token nuovo → refresh senza reconnect */
      if (mode === 'private' && token) {
        this.socket.auth = { token };
        this.socket.emit('auth_refresh');
      }
      return;           // nient’altro da fare
    }

    /* caso ➋: serve effettivamente una nuova connessione ------- */
    this.mode = mode;
    this.recreateSocket(token);
  }

  /** crea la socket e ri‑aggancia TUTTI i listener registrati */
  private recreateSocket(token?: string): void {

    /* chiude la precedente (se esiste) */
    this.socket?.off();
    this.socket?.disconnect();

    /* stessa istanza server per tutto il front‑end */
    const url = 'http://localhost:8888';

    this.socket = io(url, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,

      /* reconnection nativo (back‑off esponenziale) */
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 8000,

      /* auth solo in modalità privata */
      auth: this.mode === 'private' ? { token: token ?? this.auth.getWs_accessToken?.() } : undefined
    });

    /* ri‑hook di tutti i listener dinamici -------------------- */
    for (const { event, handler } of this.listeners) {
      this.socket.on(event, handler);
    }
  }
}
