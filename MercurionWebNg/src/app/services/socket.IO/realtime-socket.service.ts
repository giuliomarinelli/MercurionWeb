import { Injectable } from '@angular/core'
import { io, Socket } from 'socket.io-client'
import { Observable } from 'rxjs'
import { AuthService } from '../auth.service'

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {

  private socket: Socket | undefined

  constructor(private readonly authService: AuthService) { }

  // Crea la connessione, sempre col token attuale!
  public connect(): void {
    if (this.socket?.connected) this.socket.disconnect()
    this.socket = io('http://localhost:8888', {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      query: {
        token: this.authService.getWs_accessToken() ?? undefined
      }
    })
  }

  public disconnect(): void {
    this.socket?.disconnect()
    this.socket = undefined
  }

  // Emit con ACK (Promise), timeout custom (default 5s)
  public emit<T, R = any>(event: string, payload?: T, timeout = 5000): Promise<R> {
    if (!this.socket) return Promise.reject('Socket non connesso')
    return new Promise<R>((resolve, reject) => {
      let settled = false
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          resolve(undefined as R)
        }
      }, timeout)
      this.socket!.emit(event, payload, (ack: R) => {
        if (!settled) {
          clearTimeout(timer)
          settled = true
          resolve(ack)
        }
      })
    })
  }

  // Subscription ad eventi (come on/disconnect/custom)
  public on<T>(event: string): Observable<T> {
    return new Observable<T>(observer => {
      if (!this.socket) throw new Error('Socket non connesso')
      const handler = (data: T) => observer.next(data)
      this.socket.on(event, handler)
      return () => this.socket?.off(event, handler)
    })
  }

  // Connessione/disconnessione (tipi void, ti restituisco Observable<void>)
  public onConnect(): Observable<void> {
    return this.on<void>('connect')
  }
  public onDisconnect(): Observable<void> {
    return this.on<void>('disconnect')
  }

  // Getter di stato rapido
  public get isConnected(): boolean {
    return !!this.socket && this.socket.connected
  }
}
