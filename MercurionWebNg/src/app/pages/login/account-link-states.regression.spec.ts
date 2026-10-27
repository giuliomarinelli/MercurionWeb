import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { of, Subject, throwError } from 'rxjs'
import { utcInstantFromEpochMs } from '@mercurion/rest-contracts'
import { PasswordRecoveryPageComponent } from '../password-recovery/password-recovery.page.component'
import { AccountActivatePageComponent } from '../account-activate/account-activate.page.component'
import { AccountService } from '../../services/account.service'
import { UserContextService } from '../../services/context/user-context.service'

const confirm = {
  statusCode: 200,
  timestamp: utcInstantFromEpochMs(0),
  message: 'Synthetic result',
}

describe('Recovery and activation link states', () => {
  async function setup(fragment: string | null, activation = false) {
    await TestBed.configureTestingModule({
      imports: [activation ? AccountActivatePageComponent : PasswordRecoveryPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { fragment: of(fragment), queryParamMap: of(convertToParamMap({})) },
        },
      ],
    }).compileComponents()
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    spyOn(TestBed.inject(UserContextService), 'logout').and.stub()
    return TestBed.inject(AccountService)
  }

  for (const fragment of [null, 't=malformed', 't=%ZZ']) {
    it(`denies reset without a server call for malformed or absent input: ${fragment}`, async () => {
      const service = await setup(fragment)
      const authorize = spyOn(service, 'isAuthorizedToRecoverPassword')
      const fixture = TestBed.createComponent(PasswordRecoveryPageComponent)
      fixture.detectChanges()
      expect(fixture.componentInstance.linkError()).toBeTrue()
      expect(authorize).not.toHaveBeenCalled()
      expect(fixture.nativeElement.querySelector('form')).toBeNull()
      fixture.destroy()
    })
  }

  it('keeps the reset form hidden until the server authorizes the link, and submits only once', async () => {
    const service = await setup('t=a.b.c')
    const check = new Subject<boolean>()
    const change = new Subject<never>()
    const authorize = spyOn(service, 'isAuthorizedToRecoverPassword').and.returnValue(check)
    const send = spyOn(service, 'recoverPassword').and.returnValue(change)
    const fixture = TestBed.createComponent(PasswordRecoveryPageComponent)
    fixture.detectChanges()
    expect(authorize).toHaveBeenCalledOnceWith('a.b.c')
    expect(fixture.nativeElement.querySelector('form')).toBeNull()
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Verifica'
    )
    check.next(true)
    check.complete()
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull()
    fixture.componentInstance.form.setValue({ password: 'Aa1!aaaa', confirmPassword: 'Aa1!aaaa' })
    fixture.componentInstance.send()
    fixture.componentInstance.send()
    expect(send).toHaveBeenCalledOnceWith({ newPassword: 'Aa1!aaaa' }, 'a.b.c')
    fixture.destroy()
    expect(change.observed).toBeFalse()
  })

  for (const failure of [false, 'outage']) {
    it(`keeps reset denied after server refusal or failure: ${failure}`, async () => {
      const service = await setup('t=a.b.c')
      spyOn(service, 'isAuthorizedToRecoverPassword').and.returnValue(
        failure === false ? of(false) : throwError(() => ({ status: 503 }))
      )
      const fixture = TestBed.createComponent(PasswordRecoveryPageComponent)
      fixture.detectChanges()
      expect(fixture.componentInstance.linkError()).toBeTrue()
      expect(fixture.componentInstance.canView()).toBeFalse()
      expect(fixture.nativeElement.querySelector('a[href="/forgot-password"]')).not.toBeNull()
      fixture.destroy()
    })
  }

  it('does not claim activation success when the response omits the recovery code', async () => {
    const service = await setup('t=a.b.c', true)
    spyOn(service, 'activateAccount').and.returnValue(of({ ...confirm, recoveryCode: '' }))
    const fixture = TestBed.createComponent(AccountActivatePageComponent)
    fixture.detectChanges()
    expect(fixture.componentInstance.loading()).toBeFalse()
    expect(fixture.componentInstance.canView()).toBeFalse()
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull()
    fixture.destroy()
  })

  it('shows activation pending and then the returned recovery code with a copy action', async () => {
    const service = await setup('t=a.b.c', true)
    const result = new Subject<typeof confirm & { recoveryCode: string }>()
    spyOn(service, 'activateAccount').and.returnValue(result)
    const fixture = TestBed.createComponent(AccountActivatePageComponent)
    fixture.detectChanges()
    expect(fixture.componentInstance.loading()).toBeTrue()
    result.next({ ...confirm, recoveryCode: 'SYNTHETIC-RECOVERY-CODE' })
    result.complete()
    fixture.detectChanges()
    expect(fixture.componentInstance.canView()).toBeTrue()
    expect(fixture.nativeElement.querySelector('code').textContent).toContain(
      'SYNTHETIC-RECOVERY-CODE'
    )
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Copia il codice di recupero"]')
    ).not.toBeNull()
    fixture.destroy()
  })
})
