import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LoginSsoChooserComponent } from './login-sso-chooser.component'

describe('LoginSsoChooserComponent', () => {
  let fixture: ComponentFixture<LoginSsoChooserComponent>
  let component: LoginSsoChooserComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginSsoChooserComponent]
    }).compileComponents()
    fixture = TestBed.createComponent(LoginSsoChooserComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('emits a typed provider selection with the current redirect', () => {
    const selection = spyOn(component.providerSelected, 'emit')
    component.redirectTo = '/dashboard'
    component.select('Google')
    expect(selection).toHaveBeenCalledWith({ provider: 'Google', redirectTo: '/dashboard' })
  })
})
