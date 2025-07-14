import { Injectable, signal, NgZone } from '@angular/core'
import { Router } from '@angular/router'
import { ToastService } from './toast.service'
import { RealtimeSocketService } from './socket.IO/realtime-socket.service'
import { UserContextService } from './context/user-context.service'

export type SessionSyncStatus =
  | 'pending'
  | 'handshake'
  | 'loggedIn'
  | 'sessionExpired'
  | 'disconnected'
  | 'error'

@Injectable({ providedIn: 'root' })
export class SessionSyncService {

  private _status = signal<SessionSyncStatus>('pending')
  public readonly status = this._status.asReadonly()

  private _isLoggedIn = signal(false)
  public readonly isLoggedIn = this._isLoggedIn.asReadonly()

  private _lastMessage = signal<string | null>(null)
  public readonly lastMessage = this._lastMessage.asReadonly()

  private handshakePending = false
  private retries = 0
  private maxRetries = 5

  constructor(
    private readonly realtimeSocket: RealtimeSocketService,
    private readonly userContext: UserContextService,
    private readonly toast: ToastService,
    private readonly router: Router,
    private readonly zone: NgZone
  ) {
    // Sync tra tab
    window?.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === 'login') {
        if (!event.newValue) {
          this.logout({ silent: false, fromStorage: true })
        }
      }
    })

    this.realtimeSocket.onConnect().subscribe(() => this.zone.run(() => this.onConnect()))
    this.realtimeSocket.onDisconnect().subscribe(() => this.zone.run(() => this.onDisconnect()))
    this.realtimeSocket.on('sv.pub.session_expired').subscribe(() => this.zone.run(() => this.handleSessionExpired()))
  }

  /** Avvia handshake e sincronizzazione */
  public async syncSession({ onSuccess, onFail }: {
    onSuccess?: () => void
    onFail?: (err?: any) => void
  } = {}) {
    if (this.handshakePending) return
    this.handshakePending = true
    this._status.set('handshake')
    try {
      this.realtimeSocket.connect()
      const ack = await this.realtimeSocket.emit('so.pub.session_init')
      if (ack?.detail === 'websocket session init successful') {
        this.userContext.setInitials(localStorage.getItem('login') ?? 'U')
        this._isLoggedIn.set(true)
        this._status.set('loggedIn')
        this._lastMessage.set('Sessione valida')
        this.toast.trigger('Bentornato!', 'success')
        onSuccess?.()
      } else {
        this.handleSessionExpired()
        onFail?.()
      }
    } catch (err) {
      this._status.set('error')
      this._isLoggedIn.set(false)
      this._lastMessage.set('Errore handshake')
      this.toast.trigger('Errore durante handshake!', 'error')
      onFail?.(err)
      if (this.retries < this.maxRetries) {
        setTimeout(() => this.syncSession({ onSuccess, onFail }), 800 * (this.retries + 1))
        this.retries++
      }
    } finally {
      this.handshakePending = false
    }
  }

  private onConnect() {
    this._status.set('handshake')
    this.syncSession()
  }

  private onDisconnect() {
    this._status.set('disconnected')
    this._isLoggedIn.set(false)
    this._lastMessage.set('Connessione persa.')
    this.toast.trigger('Connessione persa. Riconnessione in corso...', 'warn')
    // Se vuoi: setTimeout(() => this.syncSession(), 1000)
  }

  private handleSessionExpired() {
    this._status.set('sessionExpired')
    this._isLoggedIn.set(false)
    this._lastMessage.set('Sessione scaduta.')
    this.userContext.clearInitials()
    this.toast.trigger('Sessione scaduta. Effettua nuovamente il login.', 'error')
    this.router.navigate(['/login'])
  }

  public logout({ silent = false, fromStorage = false } = {}) {
    this.userContext.clearInitials()
    this._isLoggedIn.set(false)
    this._status.set('sessionExpired')
    if (!silent) {
      this.toast.trigger(
        fromStorage ? 'Logout da un\'altra scheda' : 'Logout eseguito.',
        'success'
      )
    }
    this.realtimeSocket.disconnect()
    this.router.navigate(['/login'])
  }

  public async resumeSession(initials: string) {
    this.userContext.setInitials(initials)
    this._isLoggedIn.set(true)
    this._status.set('loggedIn')
    this._lastMessage.set('Sessione ripresa dopo MFA')
    this.syncSession()
  }

  public forceSessionCheck() {
    this.syncSession()
  }

  public get currentStatus(): SessionSyncStatus {
    return this._status()
  }

  public get loggedIn(): boolean {
    return this._isLoggedIn()
  }
}
