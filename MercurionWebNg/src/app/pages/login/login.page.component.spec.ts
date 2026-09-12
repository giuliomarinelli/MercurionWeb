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
import { of } from 'rxjs'

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
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, LoginPageComponent],
      providers: [
        { provide: APP_CONFIG, useValue: createAppConfig(developmentEnvironment) },
        { provide: AuthFacade, useValue: facade },
        { provide: AuthRedirectService, useValue: redirect },
        { provide: ThemeManagerService, useValue: { theme: signal('light') } }
      ]
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

})
