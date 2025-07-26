/* ──────────────────────────────────────────────────────────────
 * RealtimeSocketService  – gestione singola connessione WS
 * ────────────────────────────────────────────────────────────── */

import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

export type SocketMode = 'public' | 'private';

interface Listener<T = any> {
  event  : string;
  handler: (payload: T) => void;
}

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {

  /* stato */
  private socket?: Socket;
  private mode: SocketMode = 'public';
  private readonly listeners: Listener[] = [];

  constructor(private readonly auth: AuthService) { }

  /* ───────── API “alti‐livello” ───────── */

  ensurePrivate(token = this.auth.getWs_accessToken?.() ?? ''): void {
    this.setMode('private', token);
  }

  ensurePublic(): void {
    this.setMode('public');
  }

  connect(mode: SocketMode = this.mode): void {
    this.setMode(mode);
  }

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

  onConnect()    { return this.on<void>('connect'); }
  onDisconnect() { return this.on<string>('disconnect'); }

  /* ───────── IMPLEMENTAZIONE ───────── */

  private setMode(mode: SocketMode, token?: string): void {

    /* già nella modalità corretta */
    if (this.socket?.connected && mode === this.mode) {
      if (mode === 'private' && token) {
        this.socket.auth = { token };
        this.socket.emit('auth_refresh');
      }
      return;
    }

    this.mode = mode;
    this.recreateSocket(token);
  }

  private recreateSocket(token?: string): void {

    this.socket?.off();
    this.socket?.disconnect();

    this.socket = io('http://localhost:8888', {
      path        : '/socket.io',
      transports  : ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay    : 2_000,
      reconnectionDelayMax : 8_000,
      auth: this.mode === 'private'
        ? { token: token ?? this.auth.getWs_accessToken?.() }
        : undefined
    });

    /* ri‑aggancia tutti i listener */
    for (const { event, handler } of this.listeners) {
      this.socket.on(event, handler);          // NB: **handler** (senza parentesi!)
    }
  }
}
