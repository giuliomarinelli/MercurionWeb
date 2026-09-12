import { TestBed } from '@angular/core/testing'
import { Subject, throwError } from 'rxjs'
import { AuthUseCasesService } from './auth-use-cases.service'
import { AuthTransportService } from './auth-transport.service'
import { AuthSessionRepository } from './auth-session-repository.service'

describe('AuthUseCasesService', () => {
  function configure(transport: jasmine.SpyObj<AuthTransportService>, sessions: jasmine.SpyObj<AuthSessionRepository>) {
    TestBed.configureTestingModule({
      providers: [
        AuthUseCasesService,
        { provide: AuthTransportService, useValue: transport },
        { provide: AuthSessionRepository, useValue: sessions }
      ]
    })
  }

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
