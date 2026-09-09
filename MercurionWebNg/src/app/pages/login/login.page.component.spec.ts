import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginPageComponent } from './login.page.component';
import { APP_CONFIG, createAppConfig } from '../../config/app-config';
import { environment as developmentEnvironment } from '../../../environments/environment.development';
import { NEVER } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [{ provide: APP_CONFIG, useValue: createAppConfig(developmentEnvironment) }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('allows a valid development login without rendering or requiring Turnstile', () => {
    component['step'].set(2)
    component['loginForm'].setValue({
      email: 'automation@example.test',
      password: 'test-password',
      remember: false
    })
    fixture.detectChanges()

    expect(component.canLogin()).toBeTrue()
    expect(fixture.nativeElement.querySelector('m-turnstile')).toBeNull()

    const login = spyOn(component['authService'], 'login_firstStep').and.returnValue(NEVER)
    component.onSubmit()
    expect(login).toHaveBeenCalledWith(jasmine.objectContaining({ turnstileToken: '' }))
  })
});
