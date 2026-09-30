import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterPageComponent } from './register.page.component';

describe('RegisterPageComponent', () => {
  let component: RegisterPageComponent;
  let fixture: ComponentFixture<RegisterPageComponent>;

  beforeEach(async () => {
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
});
