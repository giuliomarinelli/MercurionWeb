import { ComponentFixture, TestBed } from '@angular/core/testing'
import { of, Subject } from 'rxjs'
import { SettingsAccountFacade } from './settings-account.facade'
import { SettingsContactPanelComponent } from './settings-contact-panel.component'
import { AccountService } from '../../services/account.service'
import { DomainInvalidationService } from '../../services/domain-invalidation.service'
import { RealtimeSyncStatusService } from '../../services/realtime-sync-status.service'
import { ToastService } from '../../services/toast.service'
import { ProfileDTO } from '../../Models/account/account.models'
import { dashboardProfile } from '../profile/dashboard/dashboard.testing'

describe('Settings account local invalidation', () => {
  let fixture: ComponentFixture<SettingsContactPanelComponent>
  let facade: SettingsAccountFacade
  let requests: Subject<ProfileDTO>[]
  let getProfile: jasmine.Spy
  let synchronized: jasmine.Spy

  beforeEach(async () => {
    requests = []
    synchronized = jasmine.createSpy('markSynchronized')
    getProfile = jasmine.createSpy('getProfileRegistry').and.callFake(() => {
      const response = new Subject<ProfileDTO>()
      requests.push(response)
      return response
    })
    await TestBed.configureTestingModule({
      imports: [SettingsContactPanelComponent],
      providers: [
        {
          provide: AccountService,
          useValue: {
            getCurrentVersion: () => of({ version: '1.0.0', revision: 'synthetic' }),
            getProvidedAccountId: () => of({ provider: 'Mercurion' }),
            getProfileRegistry: getProfile,
          },
        },
        { provide: ToastService, useValue: { trigger: jasmine.createSpy('trigger') } },
        { provide: RealtimeSyncStatusService, useValue: { markSynchronized: synchronized } },
      ],
    })
      .overrideComponent(SettingsContactPanelComponent, {
        add: { providers: [SettingsAccountFacade] },
      })
      .compileComponents()
    fixture = TestBed.createComponent(SettingsContactPanelComponent)
    facade = fixture.debugElement.injector.get(SettingsAccountFacade)
    facade.load()
    respond(null)
    await fixture.whenStable()
  })

  function respond(obscuredPhone: string | null) {
    requests.at(-1)!.next(dashboardProfile({ obscuredPhone }))
    requests.at(-1)!.complete()
    fixture.detectChanges()
  }

  async function changed(remote = false) {
    TestBed.inject(DomainInvalidationService).publish({
      domain: 'profile',
      action: 'changed',
      remote,
    })
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('updates the rendered contact after adding, changing and deleting a phone locally', async () => {
    const panel = fixture.nativeElement.querySelector('.settings-panel-content')
    expect(fixture.nativeElement.textContent).toContain('Non aggiunto')
    for (const phone of ['+39******01', '+39******02', null]) {
      const previousCount = getProfile.calls.count()
      await changed()
      expect(getProfile.calls.count()).toBe(previousCount + 1)
      expect(facade.loading()).toBeFalse()
      respond(phone)
      expect(fixture.nativeElement.querySelector('.settings-panel-content')).toBe(panel)
      expect(fixture.nativeElement.textContent).toContain(phone ?? 'Non aggiunto')
      expect(
        Boolean(fixture.nativeElement.querySelector('[aria-label="Aggiungi numero di telefono"]'))
      ).toBe(phone === null)
      expect(
        Boolean(fixture.nativeElement.querySelector('[aria-label="Rimuovi numero di telefono"]'))
      ).toBe(phone !== null)
    }
    expect(synchronized).not.toHaveBeenCalled()
    expect(getProfile).toHaveBeenCalledWith(false)
  })

  it('preserves remote synchronization and ignores unrelated invalidations', async () => {
    await changed(true)
    expect(getProfile.calls.count()).toBe(2)
    expect(synchronized).toHaveBeenCalledTimes(1)
    respond('+39******01')
    TestBed.inject(DomainInvalidationService).publish({ domain: 'ticket', action: 'changed' })
    fixture.detectChanges()
    await fixture.whenStable()
    expect(getProfile.calls.count()).toBe(2)
  })

  it('cancels a pending request and does not reload after the page is destroyed', async () => {
    await changed()
    expect(requests.at(-1)!.observed).toBeTrue()
    TestBed.inject(DomainInvalidationService).publish({ domain: 'profile', action: 'changed' })
    fixture.detectChanges()
    const count = getProfile.calls.count()
    fixture.destroy()
    await Promise.resolve()
    expect(requests.at(-1)!.observed).toBeFalse()
    expect(getProfile.calls.count()).toBe(count)
  })
})
