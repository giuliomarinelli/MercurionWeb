import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RouterTestingModule } from '@angular/router/testing'
import { LoginSsoChooserComponent } from './login-sso-chooser.component'

describe('LoginSsoChooserComponent', () => {
  let fixture: ComponentFixture<LoginSsoChooserComponent>
  let component: LoginSsoChooserComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, LoginSsoChooserComponent]
    }).compileComponents()
    fixture = TestBed.createComponent(LoginSsoChooserComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('emits a typed provider selection with the current redirect', () => {
    fixture.componentRef.setInput('redirectTo', '/dashboard')
    expect(component.select('Google')).toEqual({ provider: 'Google', redirectTo: '/dashboard' })
  })

  it('builds the ORCID SSO handoff URL', () => {
    expect(component.hrefFor('ORCID')).toBe('/api/oauth2/sso/ORCID/login')
  })

  it('renders every provider as a styled control with an icon', () => {
    const controls = fixture.nativeElement.querySelectorAll('section > a') as NodeListOf<HTMLAnchorElement>

    expect(controls.length).toBe(3)
    controls.forEach(control => {
      expect(control.querySelector('svg')).not.toBeNull()
      expect(control.getAttribute('aria-label')).toContain('Continua con ')
      expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(48)
    })
  })

  it('preserves the encoded return destination for every provider', () => {
    fixture.componentRef.setInput('redirectTo', '/molecules/editor?mode=create&tab=live')
    fixture.detectChanges()
    for (const link of fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>) {
      expect(new URL(link.href).searchParams.get('redirect_to')).toBe('/molecules/editor?mode=create&tab=live')
    }
  })
})
