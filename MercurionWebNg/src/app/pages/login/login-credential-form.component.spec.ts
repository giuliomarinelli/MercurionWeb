import { ComponentFixture, TestBed } from '@angular/core/testing'
import { APP_CONFIG, createAppConfig } from '../../config/app-config'
import { environment as developmentEnvironment } from '../../../environments/environment.development'
import { LoginCredentialFormComponent } from './login-credential-form.component'
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component'
import { LoginTurnstileStub } from './login-turnstile.testing'

describe('LoginCredentialFormComponent', () => {
  let fixture: ComponentFixture<LoginCredentialFormComponent>
  let component: LoginCredentialFormComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginCredentialFormComponent],
      providers: [{ provide: APP_CONFIG, useValue: createAppConfig(developmentEnvironment) }]
    }).overrideComponent(LoginCredentialFormComponent, {
      remove: { imports: [TurnstileComponent] }, add: { imports: [LoginTurnstileStub] }
    }).compileComponents()
    fixture = TestBed.createComponent(LoginCredentialFormComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('uses non-nullable controls and emits semantic credential submissions', () => {
    const submit = spyOn(component.credentialsSubmitted, 'emit')
    component.step.set(2)
    component.form.setValue({
      email: 'person@example.test',
      password: 'password',
      remember: false
    })
    component.onTurnstileToken('turnstile-test-token')
    component.submitCredentials()
    expect(submit).toHaveBeenCalledWith({
      email: 'person@example.test',
      password: 'password',
      remember: false,
      turnstileToken: 'turnstile-test-token'
    })
  })

  it('returns to email entry and clears password when email changes', () => {
    component.form.setValue({
      email: 'first@example.test',
      password: 'password',
      remember: true
    })
    component.step.set(2)
    component.showCredentialError('Errore')

    component.form.controls.email.setValue('second@example.test')

    expect(component.step()).toBe(1)
    expect(component.form.controls.password.value).toBe('')
    expect(component.credentialError()).toBeNull()
  })

  it('preserves the native username field between steps and identifies the password for autofill', () => {
    const email: HTMLInputElement = fixture.nativeElement.querySelector('input[type="email"]')
    expect(email.id).toBe('login-email')
    expect(email.name).toBe('email')
    expect(email.autocomplete).toBe('username')
    email.value = 'person@example.test'
    email.dispatchEvent(new AnimationEvent('animationstart', { animationName: 'cdk-text-field-autofill-start' }))
    fixture.detectChanges()
    expect(component.form.controls.email.value).toBe('person@example.test')

    component.showPasswordStep()
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('input[type="email"]')).toBe(email)
    const password: HTMLInputElement = fixture.nativeElement.querySelector('input[type="password"]')
    expect(password.name).toBe('password')
    expect(password.autocomplete).toBe('current-password')
    password.value = 'saved-password'
    password.dispatchEvent(new AnimationEvent('animationstart', { animationName: 'cdk-text-field-autofill-start' }))
    email.dispatchEvent(new Event('change'))
    fixture.detectChanges()
    expect(component.step()).toBe(2)
    expect(component.form.controls.password.value).toBe('saved-password')
  })

  it('submits the email through the native form without requiring a password first', () => {
    const submitted = spyOn(component.emailSubmitted, 'emit')
    const credentials = spyOn(component.credentialsSubmitted, 'emit')
    component.form.controls.email.setValue('person@example.test')
    fixture.detectChanges()
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(submitted).toHaveBeenCalledOnceWith('person@example.test')
    expect(credentials).not.toHaveBeenCalled()
  })

  it('moves focus to the password and offers an explicit return preserving email and preference', async () => {
    component.form.setValue({ email: 'person@example.test', password: 'test-password', remember: true })
    const email = fixture.nativeElement.querySelector('#login-email') as HTMLInputElement
    component.showPasswordStep()
    fixture.detectChanges()
    TestBed.tick()
    await fixture.whenStable()
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#login-password'))
    component.onTurnstileToken('test-token')
    component.editEmail()
    fixture.detectChanges()
    TestBed.tick()
    await fixture.whenStable()
    expect(component.form.getRawValue()).toEqual({ email: 'person@example.test', password: '', remember: true })
    expect(component.turnstileToken()).toBe('')
    expect(fixture.nativeElement.querySelector('#login-email')).toBe(email)
    expect(document.activeElement).toBe(email)
    expect(fixture.nativeElement.querySelector('#login-password')).toBeNull()
  })
})
