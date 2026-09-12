import { Injectable, inject } from '@angular/core'
import { Router } from '@angular/router'
import { Observable, finalize, firstValueFrom, of, shareReplay, tap } from 'rxjs'
import { AuthTransportService } from './auth-transport.service'
import { AuthSessionRepository } from './auth-session-repository.service'

/** Composes protocol and session contracts for multi-step commands. */
@Injectable({ providedIn: 'root' })
export class AuthUseCasesService {
  private readonly transport = inject(AuthTransportService)
  private readonly sessions = inject(AuthSessionRepository)
  private readonly router = inject(Router)
  private logoutInFlight$?: Observable<void>
  private refreshInFlight$?: Observable<string>

  logout(): Observable<void> {
    if (this.logoutInFlight$) return this.logoutInFlight$
    if (this.sessions.stateKind() === 'anonymous' || this.sessions.stateKind() === 'session-expired') return of(undefined)
    this.sessions.logout()
    this.sessions.releaseRefreshLock()
    this.logoutInFlight$ = this.transport.logout().pipe(
      finalize(() => { this.logoutInFlight$ = undefined }),
      shareReplay({ bufferSize: 1, refCount: false })
    )
    return this.logoutInFlight$
  }

  refreshWsAccessToken(): Observable<string> {
    if (!this.refreshInFlight$) {
      const sessionId = this.sessions.clientSessionId()
      this.refreshInFlight$ = this.transport.refreshWsAccessToken().pipe(
        tap(token => { if (sessionId) this.sessions.rotateWsAccessToken(token, sessionId) }),
        finalize(() => { this.refreshInFlight$ = undefined }),
        shareReplay(1)
      )
    }
    return this.refreshInFlight$
  }

  async refreshWsAccessTokenLocked(timeoutMs = 6000): Promise<string | null> {
    const start = Date.now()
    if (this.sessions.tryAcquireRefreshLock()) {
      try { return await firstValueFrom(this.refreshWsAccessToken()) }
      catch { return null }
      finally { this.sessions.releaseRefreshLock() }
    }
    await this.sessions.waitForRefreshChange(timeoutMs - (Date.now() - start))
    return this.sessions.getWsAccessToken()
  }

  logoutFromSession(signedSessionId: string, current = false): Observable<unknown> {
    return this.transport.logoutFromSession(signedSessionId).pipe(tap(() => {
      if (current) {
        this.sessions.logout()
        void this.router.navigateByUrl('/login')
      }
    }))
  }

  logoutFromAllSessions(): Observable<unknown> {
    return this.transport.logoutFromAllSessions().pipe(tap(() => {
      this.sessions.logout()
      void this.router.navigateByUrl('/login')
    }))
  }
}
