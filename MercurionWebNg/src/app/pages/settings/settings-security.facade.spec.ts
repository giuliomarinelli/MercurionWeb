import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { utcInstantFromEpochMs } from '@mercurion/rest-contracts'
import { Subject, of } from 'rxjs'
import type { SessionDTOExt } from '../../Models/account/account.models'
import { AccountService } from '../../services/account.service'
import { AuthUseCasesService } from '../../services/auth-use-cases.service'
import { DomainInvalidationService } from '../../services/domain-invalidation.service'
import { RealtimeSyncStatusService } from '../../services/realtime-sync-status.service'
import { SessionSyncService } from '../../services/session-sync.service'
import { ToastService } from '../../services/toast.service'
import { UserContextService } from '../../services/context/user-context.service'
import { SettingsSecurityFacade } from './settings-security.facade'

describe('SettingsSecurityFacade selective logout', () => {
  let facade: SettingsSecurityFacade
  let response: Subject<unknown>
  let auth: jasmine.SpyObj<AuthUseCasesService>
  let account: jasmine.SpyObj<AccountService>
  let toast: jasmine.SpyObj<ToastService>
  let user: jasmine.SpyObj<UserContextService>
  let sessionSync: jasmine.SpyObj<SessionSyncService>

  const session = (id: string, current = false): SessionDTOExt => ({
    id,
    current,
    createdAt: utcInstantFromEpochMs(0),
    expiresAt: utcInstantFromEpochMs(0),
    lastAccessedAt: utcInstantFromEpochMs(0),
    valid: true,
    location: 'Local',
    browser: 'Test',
    provider: 'Mercurion',
    triggerDisappear: signal(false),
    isBeingDeleted: false,
  })

  beforeEach(() => {
    response = new Subject<unknown>()
    auth = jasmine.createSpyObj('AuthUseCasesService', ['logoutFromSession'])
    auth.logoutFromSession.and.returnValue(response)
    account = jasmine.createSpyObj('AccountService', ['isMfaEnabled', 'getActiveSessions'])
    account.isMfaEnabled.and.returnValue(of(false))
    toast = jasmine.createSpyObj('ToastService', ['trigger'])
    user = jasmine.createSpyObj('UserContextService', ['logout'])
    sessionSync = jasmine.createSpyObj('SessionSyncService', ['notifyVoluntaryLogout'])
    TestBed.configureTestingModule({
      providers: [
        SettingsSecurityFacade,
        { provide: AccountService, useValue: account },
        { provide: AuthUseCasesService, useValue: auth },
        { provide: ToastService, useValue: toast },
        { provide: UserContextService, useValue: user },
        { provide: SessionSyncService, useValue: sessionSync },
        { provide: DomainInvalidationService, useValue: { last: signal(undefined) } },
        { provide: RealtimeSyncStatusService, useValue: { markSynchronized: jasmine.createSpy() } },
      ],
    })
    facade = TestBed.inject(SettingsSecurityFacade)
    facade.sessions.set([session('remote'), session('current', true)])
  })

  it('retains the pending session and removes only that card after HTTP success', () => {
    facade.logoutSession('remote')

    expect(facade.sessions().map(item => item.id)).toEqual(['remote', 'current'])
    expect(facade.sessions()[0].isBeingDeleted).toBeTrue()
    expect(facade.sessions()[1].isBeingDeleted).toBeFalse()
    expect(auth.logoutFromSession).toHaveBeenCalledOnceWith('remote', false)

    response.next({ success: true })
    response.complete()

    expect(facade.sessions().map(item => item.id)).toEqual(['current'])
    expect(user.logout).not.toHaveBeenCalled()
    expect(sessionSync.notifyVoluntaryLogout).not.toHaveBeenCalled()
  })

  it('restores the card on HTTP error and allows retrying', () => {
    facade.logoutSession('remote')
    response.error(new Error('HTTP failed'))

    expect(facade.sessions().map(item => item.id)).toEqual(['remote', 'current'])
    expect(facade.sessions()[0].isBeingDeleted).toBeFalse()
    expect(toast.trigger).toHaveBeenCalledWith('La sessione non è stata eliminata.', 'error')

    auth.logoutFromSession.and.returnValue(new Subject<unknown>())
    facade.logoutSession('remote')
    expect(auth.logoutFromSession).toHaveBeenCalledTimes(2)
  })

  it('ignores repeated requests while the session logout is pending', () => {
    facade.logoutSession('remote')
    facade.logoutSession('remote')
    facade.logoutSession('missing')

    expect(auth.logoutFromSession).toHaveBeenCalledTimes(1)
  })

  it('keeps a pending card when realtime refresh no longer contains the session', () => {
    facade.logoutSession('remote')
    account.getActiveSessions.and.returnValue(of([session('current', true)]))
    facade.load(true)

    expect(facade.sessions().find(item => item.id === 'remote')?.isBeingDeleted).toBeTrue()

    response.next({ success: true })
    expect(facade.sessions().map(item => item.id)).toEqual(['current'])
  })

  it('preserves the spinner when a refresh still contains the pending session', () => {
    facade.logoutSession('remote')
    account.getActiveSessions.and.returnValue(of([session('remote'), session('current', true)]))
    facade.load(true)

    expect(facade.sessions()[0].isBeingDeleted).toBeTrue()
  })

  it('refreshes other sessions while preserving only the pending logout card', () => {
    facade.sessions.update(items => [...items, session('expired')])
    facade.logoutSession('remote')
    account.getActiveSessions.and.returnValue(of([
      { ...session('current', true), browser: 'Updated browser' },
      session('new'),
    ]))
    facade.load(true)

    expect(facade.sessions().find(item => item.id === 'remote')?.isBeingDeleted).toBeTrue()
    expect(facade.sessions().find(item => item.id === 'current')?.browser).toBe('Updated browser')
    expect(facade.sessions().find(item => item.id === 'new')?.isBeingDeleted).toBeFalse()
    expect(facade.sessions().some(item => item.id === 'expired')).toBeFalse()
  })

  it('logs out the current user only after HTTP success for the current session', () => {
    facade.logoutSession('current')
    expect(user.logout).not.toHaveBeenCalled()
    expect(sessionSync.notifyVoluntaryLogout).not.toHaveBeenCalled()

    response.next({ success: true })

    expect(auth.logoutFromSession).toHaveBeenCalledOnceWith('current', true)
    expect(user.logout).toHaveBeenCalledTimes(1)
    expect(sessionSync.notifyVoluntaryLogout).toHaveBeenCalledTimes(1)
    expect(facade.sessions().map(item => item.id)).toEqual(['remote'])
  })
})
