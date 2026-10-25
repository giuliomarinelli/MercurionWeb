import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { RouterTestingModule } from '@angular/router/testing'
import { LoginPageComponent } from './login.page.component'
import { APP_CONFIG, createAppConfig } from '../../config/app-config'
import { environment as developmentEnvironment } from '../../../environments/environment.development'
import { AuthFacade } from '../../services/auth.facade'
import { AuthErrorService } from '../../services/auth-error.service'
import { AuthRedirectService } from '../../services/auth-redirect.service'
import { ThemeManagerService } from '../../services/context/theme-manager.service'
import { of, Subject, throwError } from 'rxjs'
import { HttpErrorResponse } from '@angular/common/http'
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component'
import { LoginCredentialFormComponent } from './login-credential-form.component'
import { LoginTurnstileStub } from './login-turnstile.testing'

describe('LoginPageComponent', () => {
  let component: LoginPageComponent
  let fixture: ComponentFixture<LoginPageComponent>
  const facade = {
    prepareLogin: jasmine.createSpy().and.returnValue(of({ fingerprintBase64: 'fingerprint', sessionDeviceInfo: {
      osPlatform: 'test', useragent: 'test', browser: { name: 'test', version: '1' }
    } })),
    checkEmail: jasmine.createSpy().and.returnValue(of(undefined)),
    login: jasmine.createSpy().and.returnValue(of({ kind: 'authenticated', initials: 'AB' })),
    captureRedirect: jasmine.createSpy(),
    selectSso: jasmine.createSpy(),
    cancelLogin: jasmine.createSpy()
  }
  const redirect = {
    peek: jasmine.createSpy().and.returnValue('/dashboard')
  }

  beforeEach(async () => {
    facade.checkEmail.calls.reset()
    facade.checkEmail.and.returnValue(of(undefined))
    facade.login.calls.reset()
    facade.login.and.returnValue(of({ kind: 'authenticated', initials: 'AB' }))
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, LoginPageComponent],
      providers: [
        { provide: APP_CONFIG, useValue: createAppConfig(developmentEnvironment) },
        { provide: AuthFacade, useValue: facade },
        { provide: AuthRedirectService, useValue: redirect },
        { provide: ThemeManagerService, useValue: { theme: signal('light') } }
      ]
    }).overrideComponent(LoginCredentialFormComponent, {
      remove: { imports: [TurnstileComponent] }, add: { imports: [LoginTurnstileStub] }
    }).compileComponents()

    fixture = TestBed.createComponent(LoginPageComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('creates independently from HTTP, storage and session services', () => {
    expect(component).toBeTruthy()
    expect(facade.prepareLogin).toHaveBeenCalled()
  })

  it('delegates credential submission to the canonical facade', () => {
    component.submit({
      email: 'person@example.test',
      password: 'password',
      remember: false,
      turnstileToken: ''
    })

    expect(facade.login).toHaveBeenCalledWith(jasmine.objectContaining({
      email: 'person@example.test',
      password: 'password'
    }))
  })

  it('blocks repeated email checks, retains the email on failure and permits retry', () => {
    const response = new Subject<undefined>()
    facade.checkEmail.and.returnValue(response)
    const form = component.credentialForm()!
    form.form.controls.email.setValue('person@example.test')
    fixture.detectChanges()
    const button = fixture.nativeElement.querySelector('#login-form button[type="submit"]') as HTMLButtonElement
    const bounds = button.getBoundingClientRect()
    form.submitEmail()
    form.submitEmail()
    fixture.detectChanges()
    expect(facade.checkEmail).toHaveBeenCalledTimes(1)
    expect(button.disabled).toBeTrue()
    expect((fixture.nativeElement.querySelector('#login-email') as HTMLInputElement).matches(':disabled')).toBeTrue()
    expect(button.getBoundingClientRect().height).toBe(bounds.height)
    expect(button.getBoundingClientRect().width).toBe(bounds.width)
    response.error(new HttpErrorResponse({ status: 401, error: { code: 'AUTHENTICATION_INVALID_CREDENTIALS' } }))
    fixture.detectChanges()
    expect(form.pending()).toBeFalse()
    expect(button.disabled).toBeFalse()
    expect((fixture.nativeElement.querySelector('#login-email') as HTMLInputElement).matches(':disabled')).toBeFalse()
    expect(form.form.controls.email.value).toBe('person@example.test')
    expect(fixture.nativeElement.querySelectorAll('[role="alert"]').length).toBe(1)
    facade.checkEmail.and.returnValue(of(undefined))
    form.submitEmail()
    fixture.detectChanges()
    expect(form.step()).toBe(2)
    expect(form.pending()).toBeFalse()
  })

  it('preserves credentials and preference after a failed login without duplicating the alert', () => {
    const form = component.credentialForm()!
    form.form.setValue({ email: 'person@example.test', password: 'test-password', remember: true })
    form.showPasswordStep()
    fixture.detectChanges()
    facade.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401, error: { code: 'AUTHENTICATION_INVALID_CREDENTIALS' } })))
    component.submit({ ...form.form.getRawValue(), turnstileToken: '' })
    fixture.detectChanges()
    expect(form.form.getRawValue()).toEqual({ email: 'person@example.test', password: 'test-password', remember: true })
    expect(form.pending()).toBeFalse()
    expect(fixture.nativeElement.querySelectorAll('[role="alert"]').length).toBe(1)
  })

  it('cancels the pending email check when leaving the page', () => {
    const response = new Subject<undefined>()
    facade.checkEmail.and.returnValue(response)
    component.checkEmail('person@example.test')
    expect(response.observed).toBeTrue()
    fixture.destroy()
    expect(response.observed).toBeFalse()
  })

})
