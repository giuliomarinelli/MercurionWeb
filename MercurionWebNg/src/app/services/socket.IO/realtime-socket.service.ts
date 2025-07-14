// src/app/services/socket.IO/realtime-socket.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

type Listener = { event: string; handler: (...a: any) => void };

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {

  private socket: Socket | undefined;
  private listeners: Listener[] = [];

  constructor(private readonly auth: AuthService) {}

  /* ──────────────────────────────── (re)connect ──────────────────────────────── */
  public connect(): void {
    const token = this.auth.getWs_accessToken() ?? undefined;

    // chiudiamo sempre la vecchia socket (se c’è)
    if (this.socket) {
      this.socket.off();
      this.socket.disconnect();
    }

    /** nuova istanza */
    this.socket = io('http://localhost:8888', {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      auth: { token }          // ← schema consigliato v4
    });

    /** ri-aggancio di TUTTI i listener dichiarati finora */
    for (const { event, handler } of this.listeners) {
      this.socket.on(event, handler);
    }
  }

  public disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
  }

  /* ──────────────────────────────── emit w/ ACK ──────────────────────────────── */
  public emit<T, R = any>(event: string, payload?: T, timeout = 5000): Promise<R> {
    if (!this.socket) return Promise.reject('Socket non connessa');
    return new Promise<R>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) { settled = true; resolve(undefined as R); }
      }, timeout);

      this.socket?.emit(event, payload, (ack: R) => {
        if (!settled) { clearTimeout(timer); settled = true; resolve(ack); }
      });
    });
  }

  /* ─────────────────────────────── generic on() ─────────────────────────────── */
  public on<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      const handler = (data: T) => observer.next(data);

      /** memorizzo SEMPRE il listener */
      this.listeners.push({ event, handler });

      /** se la socket esiste già lo aggancio subito */
      this.socket?.on(event, handler);

      /** cleanup */
      return () => {
        this.socket?.off(event, handler);
        this.listeners = this.listeners.filter(l => l.handler !== handler);
      };
    });
  }

  /* helper specifici */
  public onConnect(): Observable<void>       { return this.on<void>('connect'); }
  public onDisconnect(): Observable<string>  { return this.on<string>('disconnect'); }

  /* stato rapido */
  public get isConnected(): boolean { return !!this.socket?.connected; }

  /* opzionale: cambia token e riconnetti */
  public setToken(token?: string): void {
    this.auth.setWs_accessToken(token ?? null);   // salva dove preferisci
    this.connect();                       // ricrea la socket con il nuovo token
  }
}
