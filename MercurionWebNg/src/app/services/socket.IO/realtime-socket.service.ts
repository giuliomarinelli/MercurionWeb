import { AuthService } from './../auth.service';
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {

  private readonly socket: Socket

  constructor(
    private readonly authService: AuthService
  ) {
    this.socket = io('http://localhost:8888', {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      query: {
        token: this.authService.getAccessToken() ?? undefined
      }
    })
  }

  public emit<T>(event: string, payload?: T): void {
    this.socket.emit(event, payload)
  }

  public on<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      const handler = (data: T) => observer.next(data);
      this.socket.on(event, handler);
      return () => this.socket.off(event, handler);
    })
  }

  public onConnect(): Observable<void> {
    return this.on<void>('connect')
  }
  public onDisconnect(): Observable<void> {
    return this.on<void>('disconnect')
  }

  public connect(): void {
    this.socket.connect()
  }

  public disconnect(): void {
    this.socket.disconnect()
  }

}
