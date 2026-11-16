import { By } from '@angular/platform-browser'
import { AccountService } from '../../services/account.service'
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component'
import { Subject } from 'rxjs'
import { ComponentFixture, TestBed } from '@angular/core/testing'

import { ForgotPasswordPageComponent } from './forgot-password.page.component'

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordPageComponent
  let fixture: ComponentFixture<ForgotPasswordPageComponent>

  beforeEach(async () => {
    spyOn(TurnstileComponent.prototype, 'ngOnInit').and.stub()
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPageComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(ForgotPasswordPageComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('prevents duplicate sends, retains the address on failure and requires a fresh challenge to retry', () => {
    const pending = new Subject<never>()
    const send = spyOn(TestBed.inject(AccountService), 'sendForgottenPasswordLink').and.returnValue(
      pending
    )
    const challenge = fixture.debugElement.query(By.directive(TurnstileComponent))
      .componentInstance as TurnstileComponent
    spyOn(challenge, 'reset').and.stub()
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input')
    input.value = 'person@example.test'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('blur'))
    challenge.token.emit('challenge-token')
    fixture.detectChanges()
    const submit = () =>
      fixture.nativeElement
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    submit()
    submit()
    fixture.detectChanges()
    expect(send).toHaveBeenCalledTimes(1)
    expect(input.matches(':disabled')).toBeTrue()
    pending.error({ status: 503 })
    fixture.detectChanges()
    expect(input.value).toBe('person@example.test')
    expect(input.matches(':disabled')).toBeFalse()
    expect(fixture.nativeElement.querySelectorAll('[role="alert"]').length).toBe(1)
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue()
    expect(challenge.reset).toHaveBeenCalledTimes(1)
    submit()
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('cancels an in-flight request on navigation away', () => {
    const pending = new Subject<never>()
    spyOn(TestBed.inject(AccountService), 'sendForgottenPasswordLink').and.returnValue(pending)
    const challenge = fixture.debugElement.query(By.directive(TurnstileComponent))
      .componentInstance as TurnstileComponent
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input')
    input.value = 'person@example.test'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('blur'))
    challenge.token.emit('challenge-token')
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }))
    expect(pending.observed).toBeTrue()
    fixture.destroy()
    expect(pending.observed).toBeFalse()
  })
})
