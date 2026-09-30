import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { EMPTY } from 'rxjs'
import { AuthStateStore } from './auth-state.store'
import { RealtimeSocketService } from './socket-io/realtime-socket.service'
import { SessionSyncTransportService } from './session-sync.transport.service'

describe('SessionSyncTransportService restore', () => {
  it('does not treat credentials cleared for an active SSO login as an expired session', async () => {
    localStorage.clear()
    document.cookie = '__logged_in=true; path=/'
    localStorage.setItem('login', 'OLD')
    const socket = jasmine.createSpyObj<RealtimeSocketService>('RealtimeSocketService', [
      'onConnect', 'onDisconnect', 'onApplicationError', 'onSessionExpired',
      'connect', 'ensurePrivate', 'ensurePublic'
    ])
    socket.onConnect.and.returnValue(EMPTY)
    socket.onDisconnect.and.returnValue(EMPTY)
    socket.onApplicationError.and.returnValue(EMPTY)
    socket.onSessionExpired.and.returnValue(EMPTY)
    TestBed.configureTestingModule({
      providers: [provideRouter([]), SessionSyncTransportService, { provide: RealtimeSocketService, useValue: socket }]
    })
    const state = TestBed.inject(AuthStateStore)
    state.bootstrap()
    state.beginAuthentication('sso')
    state.setPersistedInitials('AB')

    const service = TestBed.inject(SessionSyncTransportService)
    await service.checkSession(true)

    expect(state.state()).toEqual({ kind: 'authenticating', flow: 'sso' })
    expect(socket.ensurePrivate).not.toHaveBeenCalled()
    expect(socket.ensurePublic).not.toHaveBeenCalled()
    document.cookie = '__logged_in=; Max-Age=0; path=/'
    localStorage.clear()
  })

  it('does not send a private handshake after the socket falls back to public', async () => {
    localStorage.clear()
    document.cookie = '__logged_in=true; path=/'
    const socket = jasmine.createSpyObj<RealtimeSocketService>('RealtimeSocketService', [
      'onConnect', 'onDisconnect', 'onApplicationError', 'onSessionExpired',
      'connect', 'ensurePrivate', 'ensurePublic', 'getMode',
      'waitConnected', 'waitStable', 'emitSessionInit'
    ])
    socket.onConnect.and.returnValue(EMPTY)
    socket.onDisconnect.and.returnValue(EMPTY)
    socket.onApplicationError.and.returnValue(EMPTY)
    socket.onSessionExpired.and.returnValue(EMPTY)
    socket.ensurePrivate.and.resolveTo()
    socket.getMode.and.returnValue('public')
    TestBed.configureTestingModule({
      providers: [provideRouter([]), SessionSyncTransportService, { provide: RealtimeSocketService, useValue: socket }]
    })
    const state = TestBed.inject(AuthStateStore)
    state.setPersistedInitials('AB')
    state.bootstrap()

    const service = TestBed.inject(SessionSyncTransportService)
    await service.checkSession()

    expect(socket.ensurePrivate).toHaveBeenCalled()
    expect(socket.emitSessionInit).not.toHaveBeenCalled()
    expect(state.state()).toEqual({ kind: 'authenticating', flow: 'restore' })
    expect(document.cookie).toContain('__logged_in=true')
    document.cookie = '__logged_in=; Max-Age=0; path=/'
    localStorage.clear()
  })
})
