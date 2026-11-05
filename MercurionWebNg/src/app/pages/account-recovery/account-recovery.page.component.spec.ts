import { ComponentFixture, TestBed } from '@angular/core/testing'
import { utcInstantFromEpochMs } from '@mercurion/rest-contracts'
import { of, Subject, throwError } from 'rxjs'

import { AccountRecoveryPageComponent } from './account-recovery.page.component'
import { AuthTransportService } from '../../services/auth-transport.service'
import { RecoveryService } from '../../services/recovery.service'
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component'

describe('AccountRecoveryPageComponent', () => {
  let component: AccountRecoveryPageComponent
  let fixture: ComponentFixture<AccountRecoveryPageComponent>
  let emailAvailability: jasmine.Spy<AuthTransportService['isUserAvailableByEmail']>

  beforeEach(async () => {
    spyOn(TurnstileComponent.prototype, 'ngOnInit').and.stub()
    await TestBed.configureTestingModule({
      imports: [AccountRecoveryPageComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(AccountRecoveryPageComponent)
    component = fixture.componentInstance
    emailAvailability = spyOn(
      TestBed.inject(AuthTransportService),
      'isUserAvailableByEmail'
    ).and.returnValue(of(true))
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('shows a late unavailable-email result and enables Continue only after entering an available email', () => {
    const availability = new Subject<boolean>()
    emailAvailability.and.returnValue(availability)
    const recover = spyOn(TestBed.inject(RecoveryService), 'accountRecovery_secondStep')
    component.step.set(2)
    component.turnstileToken.set('challenge-token')
    component.recoveryGroup.patchValue({
      password: 'Aa1!aaaa',
      confirmPassword: 'Aa1!aaaa',
    })
    fixture.detectChanges()

    const field: HTMLElement = fixture.nativeElement.querySelector(
      'm-text-field[formControlName="email"]'
    )
    const input: HTMLInputElement = field.querySelector('input')!
    const submit: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]')
    input.value = 'taken@example.com'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('blur'))
    fixture.detectChanges()

    expect(component.recoveryGroup.pending).toBeTrue()
    expect(submit.disabled).toBeTrue()

    availability.next(false)
    availability.complete()
    fixture.detectChanges()
    expect(emailAvailability).toHaveBeenCalledWith('taken@example.com')
    expect(component.recoveryGroup.controls.email.hasError('emailTaken')).toBeTrue()
    expect(field.querySelector('[role="alert"]')?.textContent).toContain('E-mail già registrata.')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(submit.disabled).toBeTrue()
    component.goToThirdStep()
    expect(recover).not.toHaveBeenCalled()

    emailAvailability.and.returnValue(of(true))
    input.value = 'available@example.com'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('blur'))
    fixture.detectChanges()
    expect(component.recoveryGroup.valid).toBeTrue()
    expect(field.querySelector('[role="alert"]')).toBeNull()
    expect(submit.disabled).toBeFalse()
  })

  it('explains when email availability cannot be verified', () => {
    emailAvailability.and.returnValue(throwError(() => new Error('Availability request failed')))
    component.step.set(2)
    component.turnstileToken.set('challenge-token')
    fixture.detectChanges()
    const field: HTMLElement = fixture.nativeElement.querySelector(
      'm-text-field[formControlName="email"]'
    )
    const input: HTMLInputElement = field.querySelector('input')!

    input.value = 'recovery@example.com'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('blur'))
    fixture.detectChanges()

    expect(component.recoveryGroup.controls.email.hasError('serverError')).toBeTrue()
    expect(field.querySelector('[role="alert"]')?.textContent).toContain(
      'Impossibile verificare la disponibilità'
    )
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeTrue()
  })

  it('accepts passwords with at least eight characters and rejects each missing requirement', () => {
    const password = component.recoveryGroup.controls.password

    for (const value of ['Aa1!aaaa', 'Aa1!aaaaa', 'LongerPassword123!']) {
      password.setValue(value)
      expect(password.valid).withContext(value).toBeTrue()
    }

    for (const value of ['Aa1!aaa', 'aa1!aaaa', 'AA1!AAAA', 'Aaa!aaaa', 'Aaa1aaaa']) {
      password.setValue(value)
      expect(password.hasError('pattern')).withContext(value).toBeTrue()
    }

    password.setValue('')
    expect(password.errors).toEqual({ required: true })
  })

  it('revalidates the confirmation when either password changes', () => {
    const { password, confirmPassword } = component.recoveryGroup.controls

    password.setValue('Aa1!aaaa')
    expect(confirmPassword.errors).toEqual({ required: true })
    confirmPassword.setValue('Different123!')
    expect(confirmPassword.hasError('matchPassword')).toBeTrue()
    password.setValue('Different123!')
    expect(confirmPassword.valid).toBeTrue()
    password.setValue('Aa1!aaaa')
    expect(confirmPassword.hasError('matchPassword')).toBeTrue()
    confirmPassword.setValue('Aa1!aaaa')
    expect(confirmPassword.valid).toBeTrue()
    confirmPassword.setValue('')
    expect(confirmPassword.errors).toEqual({ required: true })
  })

  it('clears server errors without recursively emitting form changes', () => {
    const codeChanges = jasmine.createSpy('codeChanges')
    const formChanges = jasmine.createSpy('formChanges')
    const codeSub = component.codeCtrl.valueChanges.subscribe(codeChanges)
    const formSub = component.recoveryGroup.valueChanges.subscribe(formChanges)
    const serverError = {
      step: 1 as const,
      error: { fieldErrors: {}, globalError: 'Errore precedente.' },
    }

    component.serverErrorStep.set(serverError)
    component.codeCtrl.setValue('recovery-code')
    expect(codeChanges).toHaveBeenCalledTimes(1)
    expect(component.serverErrorStep().error.globalError).toBeNull()

    component.serverErrorStep.set(serverError)
    component.recoveryGroup.controls.password.setValue('Aa1!aaaa')
    expect(formChanges).toHaveBeenCalledTimes(1)
    expect(component.serverErrorStep().error.globalError).toBeNull()

    codeSub.unsubscribe()
    formSub.unsubscribe()
  })

  it('updates rendered password errors and enables Continue after correcting the credentials', async () => {
    component.step.set(2)
    component.turnstileToken.set('challenge-token')
    fixture.detectChanges()

    const enterValue = (name: string, value: string) => {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(`input[name="${name}"]`)
      input.value = value
      input.dispatchEvent(new Event('input'))
      input.dispatchEvent(new Event('blur'))
      fixture.detectChanges()
    }
    const passwordField: HTMLElement = fixture.nativeElement.querySelector(
      'm-text-field[formControlName="password"]'
    )
    const confirmationField: HTMLElement = fixture.nativeElement.querySelector(
      'm-text-field[formControlName="confirmPassword"]'
    )
    const submit: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]')

    enterValue('email', 'recovery@example.com')
    enterValue('password', 'short')
    enterValue('confirmPassword', 'Aa1!aaaa')
    expect(passwordField.querySelector('[role="alert"]')?.textContent).toContain(
      'almeno 8 caratteri'
    )
    expect(confirmationField.querySelector('[role="alert"]')?.textContent).toContain(
      'non corrispondono'
    )
    expect(submit.disabled).toBeTrue()

    enterValue('password', 'Aa1!aaaa')
    await fixture.whenStable()
    fixture.detectChanges()
    expect(passwordField.querySelector('[role="alert"]')).toBeNull()
    expect(confirmationField.querySelector('[role="alert"]')).toBeNull()
    expect(component.recoveryGroup.valid).toBeTrue()
    expect(submit.disabled).toBeFalse()

    enterValue('password', 'Different123!')
    expect(confirmationField.querySelector('[role="alert"]')?.textContent).toContain(
      'non corrispondono'
    )
    expect(submit.disabled).toBeTrue()

    enterValue('confirmPassword', 'Different123!')
    expect(confirmationField.querySelector('[role="alert"]')).toBeNull()
    expect(submit.disabled).toBeFalse()
  })

  it('submits valid credentials and prevents submission when the passwords differ', () => {
    const recoveryService = TestBed.inject(RecoveryService)
    const submit = spyOn(recoveryService, 'accountRecovery_secondStep').and.returnValue(
      of({
        statusCode: 200,
        timestamp: utcInstantFromEpochMs(0),
        message: 'Account recovered',
        recoveryCode: 'new-recovery-code',
      })
    )
    component.recoveryToken.set('recovery-token')
    component.turnstileToken.set('challenge-token')
    component.recoveryGroup.setValue({
      email: 'recovery@example.com',
      password: 'Aa1!aaaa',
      confirmPassword: 'Different123!',
    })

    component.goToThirdStep()
    expect(submit).not.toHaveBeenCalled()

    component.recoveryGroup.controls.confirmPassword.setValue('Aa1!aaaa')
    component.goToThirdStep()
    expect(submit).toHaveBeenCalledOnceWith(
      'recovery@example.com',
      'Aa1!aaaa',
      'recovery-token',
      'challenge-token'
    )
    expect(component.step()).toBe(3)
  })

  it('stops reacting to form changes after destruction', () => {
    component.serverErrorStep.set({
      step: 1,
      error: { fieldErrors: {}, globalError: 'Il codice è errato.' },
    })

    fixture.destroy()
    component.codeCtrl.setValue('replacement-code')

    expect(component.serverErrorStep()).toEqual({
      step: 1,
      error: { fieldErrors: {}, globalError: 'Il codice è errato.' },
    })
  })

  it('submits the code once while pending and preserves the code after a failed verification', () => {
    const pending = new Subject<never>()
    const submit = spyOn(
      TestBed.inject(RecoveryService),
      'accountRecovery_firstStep'
    ).and.returnValue(pending)
    component.codeCtrl.setValue('synthetic-code')
    component.turnstileToken.set('synthetic-challenge')
    component.goToSecondStep()
    component.goToSecondStep()
    fixture.detectChanges()
    expect(submit).toHaveBeenCalledTimes(1)
    expect(fixture.nativeElement.querySelector('input').matches(':disabled')).toBeTrue()
    pending.error({ status: 400 })
    fixture.detectChanges()
    expect(component.step()).toBe(1)
    expect(component.loading()).toBeFalse()
    expect(component.codeCtrl.value).toBe('synthetic-code')
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('explains account locking before submitting any recovery code', () => {
    expect(fixture.nativeElement.querySelector('.auth-notice').textContent).toContain(
      'invalida tutte le sessioni'
    )
    expect(fixture.nativeElement.querySelector('a[href="/forgot-password"]')).not.toBeNull()
  })
  it('does not advance either recovery step when a successful response omits its required credential', async () => {
    const service = TestBed.inject(RecoveryService)
    const result = { statusCode: 200, timestamp: utcInstantFromEpochMs(0), message: 'Synthetic' }
    const first = spyOn(service, 'accountRecovery_firstStep').and.returnValue(
      of({ ...result, recoveryToken: '' })
    )
    component.codeCtrl.setValue('synthetic-code')
    component.onTurnstileToken('synthetic-challenge')
    fixture.detectChanges()
    fixture.nativeElement.querySelector('button[type="submit"]').click()
    fixture.detectChanges()
    expect(first).toHaveBeenCalledTimes(1)
    expect(component.step()).toBe(1)
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'verificare il codice'
    )

    first.and.returnValue(of({ ...result, recoveryToken: 'synthetic-recovery-token' }))
    component.onTurnstileToken('fresh-challenge')
    fixture.detectChanges()
    fixture.nativeElement.querySelector('button[type="submit"]').click()
    fixture.detectChanges()
    expect(component.step()).toBe(2)
    component.recoveryGroup.setValue({
      email: 'person@example.test',
      password: 'Aa1!aaaa',
      confirmPassword: 'Aa1!aaaa',
    })
    await fixture.whenStable()
    spyOn(service, 'accountRecovery_secondStep').and.returnValue(
      of({ ...result, recoveryCode: '' })
    )
    component.onTurnstileToken('another-fresh-challenge')
    fixture.detectChanges()
    fixture.nativeElement.querySelector('button[type="submit"]').click()
    fixture.detectChanges()
    expect(component.step()).toBe(2)
    expect(component.recoveryCode()).toBe('')
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'confermare il ripristino'
    )
  })
})
