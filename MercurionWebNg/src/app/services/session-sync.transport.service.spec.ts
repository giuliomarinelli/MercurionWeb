import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { EMPTY, Subject } from 'rxjs'
import { SocketSessionExpiredPayload, SocketSessionInitAcknowledgement } from '@mercurion/socket-contracts'
import { SessionInvalidationCause } from '@mercurion/rest-contracts'
import { AuthStateStore } from './auth-state.store'
import { RealtimeSocketService } from './socket-io/realtime-socket.service'
import { SessionSyncTransportService } from './session-sync.transport.service'
import { ToastService } from './toast.service'

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

describe('SessionSyncTransportService transient restore failures', () => {
  let state: AuthStateStore
  let service: SessionSyncTransportService
  let socket: jasmine.SpyObj<RealtimeSocketService>
  let expired: Subject<SocketSessionExpiredPayload>
  let connected: Subject<void>
  const accepted: SocketSessionInitAcknowledgement = {
    detail: 'websocket session init successful', state: 'authenticated'
  }
  const toast = jasmine.createSpyObj<ToastService>('ToastService', ['trigger', 'close'])

  beforeEach(() => {
    localStorage.clear()
    document.cookie = '__logged_in=true; path=/'
    expired = new Subject()
    connected = new Subject()
    toast.trigger.calls.reset()
    toast.close.calls.reset()
    toast.trigger.and.returnValue('restore-failed')
    socket = jasmine.createSpyObj<RealtimeSocketService>('RealtimeSocketService', [
      'onConnect', 'onDisconnect', 'onApplicationError', 'onSessionExpired',
      'connect', 'ensurePrivate', 'ensurePublic', 'getMode',
      'waitConnected', 'waitStable', 'emitSessionInit', 'reconnectPublicNow'
    ])
    socket.onConnect.and.returnValue(connected)
    socket.onDisconnect.and.returnValue(EMPTY)
    socket.onApplicationError.and.returnValue(EMPTY)
    socket.onSessionExpired.and.returnValue(expired)
    socket.ensurePrivate.and.resolveTo()
    socket.ensurePublic.and.resolveTo()
    socket.reconnectPublicNow.and.resolveTo()
    socket.getMode.and.returnValue('private')
    socket.waitConnected.and.resolveTo(true)
    socket.waitStable.and.resolveTo()
    socket.emitSessionInit.and.resolveTo(accepted)
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: RealtimeSocketService, useValue: socket },
        { provide: ToastService, useValue: toast }
      ]
    })
    state = TestBed.inject(AuthStateStore)
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    const token = `header.${btoa(JSON.stringify({ sub: 'opaque-user', sid: 'session-a' }))}.signature`
    state.setAccessToken(token)
    state.setWsAccessToken(token)
    state.setPersistedInitials('AB')
    state.bootstrap()
    service = TestBed.inject(SessionSyncTransportService)
  })

  afterEach(() => {
    service.ngOnDestroy()
    document.cookie = '__logged_in=; Max-Age=0; path=/'
    document.cookie = '__logged_in_=; Max-Age=0; path=/'
    localStorage.clear()
  })

  it('restores a valid session when acknowledgements take longer than the first deadline', fakeAsync(() => {
    socket.emitSessionInit.and.callFake((timeout = 5000) => new Promise(resolve => {
      setTimeout(() => resolve(timeout >= 1400 ? accepted : undefined), Math.min(timeout, 1400))
    }))
    let completed = false
    void service.checkSession().then(() => { completed = true })

    tick(1200)
    expect(completed).toBeFalse()
    expect(state.state()).toEqual({ kind: 'authenticating', flow: 'restore' })
    expect(state.getAccessToken()).toBeTruthy()
    expect(service.status()).toBe('disconnected')

    tick(1900)

    expect(completed).toBeTrue()
    expect(socket.emitSessionInit).toHaveBeenCalledTimes(2)
    expect(state.authenticated()).toBeTrue()
    expect(service.status()).toBe('loggedIn')
    expect(toast.trigger).not.toHaveBeenCalled()
  }))

  it('retries a connection timeout and shares the pending check between callers', fakeAsync(() => {
    socket.waitConnected.and.returnValues(Promise.resolve(false), Promise.resolve(true))
    void service.checkSession()
    void service.checkSession()
    tick(500)

    expect(socket.ensurePrivate).toHaveBeenCalledTimes(2)
    expect(socket.emitSessionInit).toHaveBeenCalledTimes(1)
    expect(state.authenticated()).toBeTrue()
  }))

  it('bounds retries, keeps credentials, and recovers on a later connection event', fakeAsync(() => {
    socket.emitSessionInit.and.resolveTo(undefined)
    void service.checkSession()
    tick(1500)

    expect(socket.emitSessionInit).toHaveBeenCalledTimes(3)
    expect(service.status()).toBe('disconnected')
    expect(state.state()).toEqual({ kind: 'authenticating', flow: 'restore' })
    expect(state.getAccessToken()).toBeTruthy()
    expect(document.cookie).toContain('__logged_in=true')
    expect(toast.trigger).toHaveBeenCalledOnceWith(jasmine.any(String), 'warn', 0)

    socket.emitSessionInit.and.resolveTo(accepted)
    connected.next()
    flushMicrotasks()

    expect(state.authenticated()).toBeTrue()
    expect(toast.close).toHaveBeenCalledWith('restore-failed')
  }))

  it('does not restore a session from an acknowledgement arriving after server invalidation', fakeAsync(() => {
    let acknowledge: (value: SocketSessionInitAcknowledgement) => void = () => undefined
    socket.emitSessionInit.and.callFake(() => new Promise(resolve => { acknowledge = resolve }))
    void service.checkSession()
    flushMicrotasks()

    expired.next({ detail: 'session expired', state: 'invalid', cause: SessionInvalidationCause.SessionRevoked })
    acknowledge(accepted)
    flushMicrotasks()

    expect(state.authenticated()).toBeFalse()
    expect(state.getAccessToken()).toBeNull()
    expect(service.status()).toBe('anonymous')
    expect(socket.emitSessionInit).toHaveBeenCalledTimes(1)
  }))

  it('stops retrying after a voluntary logout', fakeAsync(() => {
    socket.emitSessionInit.and.resolveTo(undefined)
    void service.checkSession()
    flushMicrotasks()

    state.logout()
    service.completeVoluntaryLogout()
    tick(2000)

    expect(socket.emitSessionInit).toHaveBeenCalledTimes(1)
    expect(state.authenticated()).toBeFalse()
    expect(service.status()).toBe('anonymous')
    expect(toast.trigger).not.toHaveBeenCalled()
  }))

  it('cancels a scheduled retry when destroyed', fakeAsync(() => {
    socket.emitSessionInit.and.resolveTo(undefined)
    void service.checkSession()
    flushMicrotasks()
    service.ngOnDestroy()
    flushMicrotasks()

    expect(socket.emitSessionInit).toHaveBeenCalledTimes(1)
    expect(toast.trigger).not.toHaveBeenCalled()
  }))
})
