import { ComponentFixture, TestBed } from '@angular/core/testing'
import { APP_CONFIG, createAppConfig } from '../../config/app-config'
import { environment as developmentEnvironment } from '../../../environments/environment.development'
import { LoginCredentialFormComponent } from './login-credential-form.component'

describe('LoginCredentialFormComponent', () => {
  let fixture: ComponentFixture<LoginCredentialFormComponent>
  let component: LoginCredentialFormComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginCredentialFormComponent],
      providers: [{ provide: APP_CONFIG, useValue: createAppConfig(developmentEnvironment) }]
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
    component.submitCredentials()
    expect(submit).toHaveBeenCalledWith({
      email: 'person@example.test',
      password: 'password',
      remember: false,
      turnstileToken: ''
    })
  })
})
