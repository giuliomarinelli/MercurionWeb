import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { firstValueFrom, of, Subject, throwError } from 'rxjs'
import { AuthUseCasesService } from './auth-use-cases.service'
import { AuthTransportService } from './auth-transport.service'
import { AuthSessionRepository } from './auth-session-repository.service'
import { AuthStateStore } from './auth-state.store'

describe('AuthUseCasesService', () => {
  function configure(transport: jasmine.SpyObj<AuthTransportService>, sessions: jasmine.SpyObj<AuthSessionRepository>) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        AuthUseCasesService,
        { provide: AuthTransportService, useValue: transport },
        { provide: AuthSessionRepository, useValue: sessions }
      ]
    })
  }

  it('persists a successful websocket refresh while restoring the existing session', async () => {
    localStorage.clear()
    document.cookie = '__logged_in=true; path=/'
    const token = (tag: string) => `header.${btoa(JSON.stringify({
      sub: 'opaque-user', sid: 'session-a', tag, exp: Math.floor(Date.now() / 1000) + 3600
    }))}.signature`
    const transport = jasmine.createSpyObj<AuthTransportService>('AuthTransportService', ['refreshWsAccessToken'])
    const refreshed = token('new-ws')
    transport.refreshWsAccessToken.and.returnValue(of(refreshed))
    TestBed.configureTestingModule({
      providers: [provideRouter([]), AuthUseCasesService, { provide: AuthTransportService, useValue: transport }]
    })
    const state = TestBed.inject(AuthStateStore)
    state.setAccessToken(token('access'))
    state.setWsAccessToken(token('old-ws'))
    state.setPersistedInitials('AB')
    state.bootstrap()

    await firstValueFrom(TestBed.inject(AuthUseCasesService).refreshWsAccessToken())

    expect(transport.refreshWsAccessToken).toHaveBeenCalledTimes(1)
    expect(state.getWsAccessToken()).toBe(refreshed)
    expect(state.state()).toEqual({ kind: 'authenticating', flow: 'restore' })
    document.cookie = '__logged_in=; Max-Age=0; path=/'
    localStorage.clear()
  })

  it('performs one local transition and one transport request for concurrent logout', () => {
    const transport = jasmine.createSpyObj<AuthTransportService>('AuthTransportService', ['logout'])
    const sessions = jasmine.createSpyObj<AuthSessionRepository>('AuthSessionRepository', ['stateKind', 'logout', 'releaseRefreshLock'])
    const pending = new Subject<void>()
    transport.logout.and.returnValue(pending)
    sessions.stateKind.and.returnValue('authenticated')
    configure(transport, sessions)
    const service = TestBed.inject(AuthUseCasesService)
    service.logout().subscribe()
    service.logout().subscribe()
    expect(transport.logout).toHaveBeenCalledTimes(1)
    expect(sessions.logout).toHaveBeenCalledTimes(1)
    pending.complete()
  })

  it('keeps the local session anonymous when revocation fails', () => {
    const transport = jasmine.createSpyObj<AuthTransportService>('AuthTransportService', ['logout'])
    const sessions = jasmine.createSpyObj<AuthSessionRepository>('AuthSessionRepository', ['stateKind', 'logout', 'releaseRefreshLock'])
    transport.logout.and.returnValue(throwError(() => new Error('network')))
    sessions.stateKind.and.returnValue('authenticated')
    configure(transport, sessions)
    TestBed.inject(AuthUseCasesService).logout().subscribe({ error: () => undefined })
    expect(sessions.logout).toHaveBeenCalled()
  })
})
