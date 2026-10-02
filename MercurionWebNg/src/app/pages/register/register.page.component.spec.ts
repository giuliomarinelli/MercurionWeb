import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { RegisterPageComponent } from './register.page.component';
import { AuthTransportService } from '../../services/auth-transport.service';
import { ApplicationErrorCode } from '../../utils/application-error.util';
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component';

describe('RegisterPageComponent', () => {
  let component: RegisterPageComponent;
  let fixture: ComponentFixture<RegisterPageComponent>;

  beforeEach(async () => {
    spyOn(TurnstileComponent.prototype, 'ngOnInit').and.stub();
    await TestBed.configureTestingModule({
      imports: [RegisterPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('accepts the original password requirements and rejects each missing requirement', () => {
    const password = component.form.controls.password;

    for (const value of ['Aa1!aaaa', 'Aa1!aaaaa']) {
      password.setValue(value);
      expect(password.valid).withContext(value).toBeTrue();
    }

    for (const value of ['Aa1!aaa', 'aa1!aaaa', 'AA1!AAAA', 'Aaa!aaaa', 'Aaa1aaaa']) {
      password.setValue(value);
      expect(password.hasError('pattern')).withContext(value).toBeTrue();
    }
  });

  it('shows one required marker on each required text field', () => {
    const fields: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('m-text-field'));
    const requiredFields = fields.filter(field => ['Nome', 'Cognome', 'E-mail', 'Password', 'Inserisci di nuovo la password']
      .some(label => field.textContent?.includes(label)));

    expect(requiredFields.length).toBe(5);
    for (const field of requiredFields) {
      const label = field.querySelector('label');
      expect(label?.textContent?.match(/\*/g)?.length).toBe(1);
    }
  });

  it('lets the acceptance text wrap on narrow layouts and expand on desktop', () => {
    const main: HTMLElement = fixture.nativeElement.querySelector('main');
    const description: HTMLElement = fixture.nativeElement.querySelector('#accept-terms-description');
    main.style.maxWidth = 'none';
    main.style.width = '320px';

    const narrowWidth = description.getBoundingClientRect().width;
    const narrowHeight = description.getBoundingClientRect().height;
    expect(description.scrollWidth).toBeLessThanOrEqual(description.clientWidth + 1);
    expect(narrowHeight).toBeGreaterThan(40);

    main.style.width = '900px';
    expect(description.getBoundingClientRect().width).toBeGreaterThan(narrowWidth);
    expect(description.getBoundingClientRect().height).toBeLessThan(narrowHeight);
  });

  it('removes the Turnstile placeholder when a reset is already ready', () => {
    const turnstile = component.turnstileComponent();
    spyOn(turnstile, 'reset').and.callFake(() => {
      turnstile.refresh.emit();
      turnstile.widgetReady.emit();
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(turnstile.reset).toHaveBeenCalled();
    expect(component.loadingTurnstile()).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('m-turnstile').classList.contains('invisible')).toBeFalse();
  });

  it('shows the registered-email message from the asynchronous availability check', async () => {
    const authService = TestBed.inject(AuthTransportService);
    spyOn(authService, 'isUserAvailableByEmail').and.returnValue(of(false));
    const emailField: HTMLElement = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('m-text-field'))
      .find(field => field.querySelector('label')?.textContent?.includes('E-mail'))!;
    const input: HTMLInputElement = emailField.querySelector('input')!;

    input.value = 'taken@example.com';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(authService.isUserAvailableByEmail).toHaveBeenCalledWith('taken@example.com');
    expect(component.form.controls.email.hasError('emailTaken')).toBeTrue();
    expect(emailField.querySelector('[role="alert"]')?.textContent).toContain('E-mail già registrata.');
  });

  it('shows a registration conflict on the email field even without API field details', async () => {
    const authService = TestBed.inject(AuthTransportService);
    spyOn(authService, 'isUserAvailableByEmail').and.returnValue(of(true));
    spyOn(authService, 'registerUser').and.returnValue(throwError(() => ({
      error: { code: ApplicationErrorCode.USER_REGISTRATION_EMAIL_CONFLICT }
    })));
    component.form.setValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      job: null,
      gender: 'F',
      password: 'Ada1!pass',
      confirmPassword: 'Ada1!pass'
    });
    await fixture.whenStable();
    component.turnstileToken.set('challenge-token');

    component.onSubmit();
    fixture.detectChanges();

    expect(authService.registerUser).toHaveBeenCalled();
    expect(component.form.controls.email.hasError('emailTaken')).toBeTrue();
    const emailField: HTMLElement = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('m-text-field'))
      .find(field => field.querySelector('label')?.textContent?.includes('E-mail'))!;
    expect(emailField.querySelector('[role="alert"]')?.textContent).toContain('E-mail già registrata.');
  });
});
