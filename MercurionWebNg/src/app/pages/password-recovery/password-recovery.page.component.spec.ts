import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { of, Subject, throwError } from 'rxjs'
import { utcInstantFromEpochMs } from '@mercurion/rest-contracts'
import { PasswordRecoveryPageComponent } from './password-recovery.page.component'
import { AccountService } from '../../services/account.service'
import { UserContextService } from '../../services/context/user-context.service'

describe('Password recovery through the rendered form', () => {
  let fixture: ComponentFixture<PasswordRecoveryPageComponent>
  let component: PasswordRecoveryPageComponent
  let service: AccountService
  let navigate: jasmine.Spy<Router['navigateByUrl']>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordRecoveryPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { fragment: of('t=a.b.c'), queryParamMap: of(convertToParamMap({})) },
        },
      ],
    }).compileComponents()
    service = TestBed.inject(AccountService)
    spyOn(service, 'isAuthorizedToRecoverPassword').and.returnValue(of(true))
    spyOn(TestBed.inject(UserContextService), 'logout')
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true)
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true)
    fixture = TestBed.createComponent(PasswordRecoveryPageComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  function fill(password = 'Aa1!aaaa', confirmation = password) {
    for (const [name, value] of [
      ['password', password],
      ['confirmPassword', confirmation],
    ]) {
      const input = fixture.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement
      input.value = value
      input.dispatchEvent(new Event('input'))
      input.dispatchEvent(new Event('blur'))
    }
    fixture.detectChanges()
  }

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]')
  }

  it('rejects weak or mismatched passwords before a request can be sent', () => {
    const send = spyOn(service, 'recoverPassword')
    for (const password of ['Aa1!aaa', 'aa1!aaaa', 'AA1!AAAA', 'Aaa!aaaa', 'Aaa1aaaa']) {
      fill(password)
      expect(button().disabled).withContext(password).toBeTrue()
      button().click()
    }
    fill('Aa1!aaaa', 'Different1!')
    expect(button().disabled).toBeTrue()
    button().click()
    expect(send).not.toHaveBeenCalled()
  })

  it('submits the authorized token once, locks the native fields and renders success only on response', () => {
    const response = new Subject<{
      statusCode: number
      timestamp: ReturnType<typeof utcInstantFromEpochMs>
      message: string
    }>()
    const send = spyOn(service, 'recoverPassword').and.returnValue(response)
    fill()
    button().click()
    fixture.detectChanges()
    button().click()
    expect(send).toHaveBeenCalledOnceWith({ newPassword: 'Aa1!aaaa' }, 'a.b.c')
    expect(button().disabled).toBeTrue()
    expect(fixture.nativeElement.querySelector('input').matches(':disabled')).toBeTrue()
    expect(fixture.nativeElement.textContent).not.toContain('Password aggiornata')
    response.next({ statusCode: 200, timestamp: utcInstantFromEpochMs(0), message: 'Synthetic' })
    response.complete()
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Password aggiornata')
    expect(fixture.nativeElement.querySelector('form')).toBeNull()
  })

  it('keeps the server error visible and redirects once after the documented delay', () => {
    const send = spyOn(service, 'recoverPassword').and.returnValue(
      throwError(() => ({ status: 500, error: {} }))
    )
    fill()
    jasmine.clock().install()
    try {
      button().click()
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
        'Tra pochi secondi'
      )
      expect(button().disabled).toBeTrue()
      button().click()
      expect(send).toHaveBeenCalledTimes(1)
      jasmine.clock().tick(2999)
      expect(navigate).not.toHaveBeenCalled()
      jasmine.clock().tick(1)
      expect(navigate).toHaveBeenCalledOnceWith('/forgot-password')
    } finally {
      jasmine.clock().uninstall()
    }
  })

  it('cancels the real error redirect when navigating away', () => {
    spyOn(service, 'recoverPassword').and.returnValue(
      throwError(() => ({ status: 500, error: {} }))
    )
    fill()
    jasmine.clock().install()
    try {
      button().click()
      fixture.destroy()
      jasmine.clock().tick(3000)
      expect(navigate).not.toHaveBeenCalled()
    } finally {
      jasmine.clock().uninstall()
    }
  })

  it('unsubscribes from an in-flight change on navigation away', () => {
    const response = new Subject<never>()
    spyOn(service, 'recoverPassword').and.returnValue(response)
    fill()
    button().click()
    expect(response.observed).toBeTrue()
    fixture.destroy()
    expect(response.observed).toBeFalse()
  })
})
