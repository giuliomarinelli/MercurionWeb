import { accountFlowIcons } from '../login/account-flow-icons.testing'
import { utcInstantFromEpochMs } from '@mercurion/rest-contracts'
import { ScrollContextService } from '../../services/context/scroll-context.service'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { of, Subject, throwError } from 'rxjs'

import { RegisterPageComponent } from './register.page.component'
import { AuthTransportService } from '../../services/auth-transport.service'
import { ApplicationErrorCode } from '../../utils/application-error.util'
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component'

describe('RegisterPageComponent', () => {
  let component: RegisterPageComponent
  let fixture: ComponentFixture<RegisterPageComponent>

  beforeEach(async () => {
    spyOn(TurnstileComponent.prototype, 'ngOnInit').and.stub()
    await TestBed.configureTestingModule({
      imports: [RegisterPageComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(RegisterPageComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('accepts the original password requirements and rejects each missing requirement', () => {
    const password = component.form.controls.password

    for (const value of ['Aa1!aaaa', 'Aa1!aaaaa']) {
      password.setValue(value)
      expect(password.valid).withContext(value).toBeTrue()
    }

    for (const value of ['Aa1!aaa', 'aa1!aaaa', 'AA1!AAAA', 'Aaa!aaaa', 'Aaa1aaaa']) {
      password.setValue(value)
      expect(password.hasError('pattern')).withContext(value).toBeTrue()
    }
  })

  it('shows one required marker on each required text field', () => {
    const fields: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('m-text-field'))
    const requiredFields = fields.filter((field) =>
      ['Nome', 'Cognome', 'E-mail', 'Password', 'Conferma password'].some((label) =>
        field.textContent?.includes(label)
      )
    )

    expect(requiredFields.length).toBe(5)
    for (const field of requiredFields) {
      const label = field.querySelector('label')
      expect(label?.textContent?.match(/\*/g)?.length).toBe(1)
    }
  })

  it('lets the acceptance text wrap on narrow layouts and expand on desktop', () => {
    const main: HTMLElement = fixture.nativeElement.querySelector('main')
    const description: HTMLElement = fixture.nativeElement.querySelector(
      '#accept-terms-description'
    )
    main.style.maxWidth = 'none'
    main.style.width = '320px'

    const narrowWidth = description.getBoundingClientRect().width
    const narrowHeight = description.getBoundingClientRect().height
    expect(description.scrollWidth).toBeLessThanOrEqual(description.clientWidth + 1)
    expect(narrowHeight).toBeGreaterThan(40)

    main.style.width = '900px'
    expect(description.getBoundingClientRect().width).toBeGreaterThan(narrowWidth)
    expect(description.getBoundingClientRect().height).toBeLessThan(narrowHeight)
  })

  it('removes the Turnstile placeholder when a reset is already ready', () => {
    const turnstile = component.turnstileComponent()!
    spyOn(turnstile, 'reset').and.callFake(() => {
      turnstile.refresh.emit()
      turnstile.widgetReady.emit()
    })

    component.onSubmit()
    fixture.detectChanges()

    expect(turnstile.reset).toHaveBeenCalled()
    expect(component.loadingTurnstile()).toBeFalse()
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull()
    expect(
      fixture.nativeElement.querySelector('m-turnstile').classList.contains('invisible')
    ).toBeFalse()
  })

  it('shows the registered-email message from the asynchronous availability check', async () => {
    const authService = TestBed.inject(AuthTransportService)
    spyOn(authService, 'isUserAvailableByEmail').and.returnValue(of(false))
    const emailField: HTMLElement = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('m-text-field')
    ).find((field) => field.querySelector('label')?.textContent?.includes('E-mail'))!
    const input: HTMLInputElement = emailField.querySelector('input')!

    input.value = 'taken@example.com'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('blur'))
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(authService.isUserAvailableByEmail).toHaveBeenCalledWith('taken@example.com')
    expect(component.form.controls.email.hasError('emailTaken')).toBeTrue()
    expect(emailField.querySelector('[role="alert"]')?.textContent).toContain(
      'E-mail già registrata.'
    )
  })

  it('shows a registration conflict on the email field even without API field details', async () => {
    const authService = TestBed.inject(AuthTransportService)
    spyOn(authService, 'isUserAvailableByEmail').and.returnValue(of(true))
    spyOn(authService, 'registerUser').and.returnValue(
      throwError(() => ({
        error: { code: ApplicationErrorCode.USER_REGISTRATION_EMAIL_CONFLICT },
      }))
    )
    component.form.setValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      job: null,
      gender: 'F',
      password: 'Ada1!pass',
      confirmPassword: 'Ada1!pass',
    })
    await fixture.whenStable()
    component.turnstileToken.set('challenge-token')
    component.acceptCtrl.setValue(true)

    component.onSubmit()
    fixture.detectChanges()

    expect(authService.registerUser).toHaveBeenCalled()
    expect(component.form.controls.email.hasError('emailTaken')).toBeTrue()
    const emailField: HTMLElement = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('m-text-field')
    ).find((field) => field.querySelector('label')?.textContent?.includes('E-mail'))!
    expect(emailField.querySelector('[role="alert"]')?.textContent).toContain(
      'E-mail già registrata.'
    )
  })

  async function validRegistration() {
    spyOn(TestBed.inject(AuthTransportService), 'isUserAvailableByEmail').and.returnValue(of(true))
    component.form.setValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
      job: null,
      gender: 'F',
      password: 'Aa1!aaaa',
      confirmPassword: 'Aa1!aaaa',
    })
    component.acceptCtrl.setValue(true)
    await fixture.whenStable()
    component.turnstileToken.set('challenge-token')
  }

  it('preserves entered values and locks native fields while a single registration request is pending', async () => {
    await validRegistration()
    const pending = new Subject<never>()
    const submit = spyOn(TestBed.inject(AuthTransportService), 'registerUser').and.returnValue(
      pending
    )
    component.onSubmit()
    component.onSubmit()
    fixture.detectChanges()
    expect(submit).toHaveBeenCalledTimes(1)
    expect(
      fixture.nativeElement.querySelector('input[name="email"]').matches(':disabled')
    ).toBeTrue()
    pending.error({ status: 503 })
    fixture.detectChanges()
    expect(component.loading()).toBeFalse()
    expect(component.form.controls.email.value).toBe('ada@example.test')
    expect(
      fixture.nativeElement.querySelector('input[name="email"]').matches(':disabled')
    ).toBeFalse()
    expect(fixture.nativeElement.querySelector('.auth-error')?.textContent).toContain('Riprova')
    expect(component.turnstileToken()).toBe('')
  })

  it('does not submit without consent, or keep using a challenge after it refreshes', async () => {
    await validRegistration()
    const submit = spyOn(TestBed.inject(AuthTransportService), 'registerUser')
    component.acceptCtrl.setValue(false)
    component.onSubmit()
    expect(submit).not.toHaveBeenCalled()
    component.acceptCtrl.setValue(true)
    component.onTurnstileRefresh()
    component.onSubmit()
    expect(submit).not.toHaveBeenCalled()
  })
  it('shows an explicit selection prompt in the closed field and in the empty menu option', () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('#register-gender-btn')
    expect(trigger.textContent).toContain('Seleziona il genere')
    trigger.click()
    fixture.detectChanges()

    const options = Array.from(
      document.querySelectorAll('#register-gender-listbox [role="option"]')
    )
    expect(options.length).toBe(4)
    expect(options.every((option) => Boolean(option.textContent?.trim()))).toBeTrue()
    expect(options[0].textContent).toContain('Seleziona il genere')
    expect(component.form.controls.gender.hasError('required')).toBeTrue()
  })
  it('toggles consent from its label and keeps the legal sentence punctuation intact', () => {
    const consent: HTMLElement = fixture.nativeElement.querySelector('.auth-consent')
    const checkbox = consent.querySelector<HTMLInputElement>('input')!
    consent.querySelector<HTMLLabelElement>('label')!.click()
    fixture.detectChanges()
    expect(checkbox.checked).toBeTrue()
    expect(component.acceptCtrl.value).toBeTrue()
    consent.querySelector<HTMLLabelElement>('label')!.click()
    fixture.detectChanges()
    expect(checkbox.checked).toBeFalse()
    expect(component.acceptCtrl.value).toBeFalse()
    const sentence = consent.textContent!.replace(/\s+/g, ' ').trim()
    expect(sentence).toContain('l’Informativa sulla Privacy, i Termini di Servizio')
    expect(sentence).toContain('Politica di Utilizzo Accettabile.')
    expect(
      Array.from(consent.querySelectorAll('a')).map((link) => link.getAttribute('href'))
    ).toEqual(['/privacy', '/terms-and-policies', '/terms-and-policies#aup'])
  })

  it('does not run queued success focus or scrolling after leaving the registration page', async () => {
    await validRegistration()
    const response = new Subject<{
      statusCode: number
      timestamp: ReturnType<typeof utcInstantFromEpochMs>
      message: string
      obscuredEmail: string
    }>()
    spyOn(TestBed.inject(AuthTransportService), 'registerUser').and.returnValue(response)
    const scroll = spyOn(TestBed.inject(ScrollContextService), 'smoothToTop')
    component.onSubmit()
    response.next({
      statusCode: 200,
      timestamp: utcInstantFromEpochMs(0),
      message: 'Synthetic',
      obscuredEmail: 'a***@example.test',
    })
    fixture.destroy()
    await Promise.resolve()
    expect(scroll).not.toHaveBeenCalled()
    expect(component.step()).toBe(1)
  })
  it('shows the original success icon and focuses the confirmation after a real submit response', async () => {
    await validRegistration()
    const response = new Subject<{
      statusCode: number
      timestamp: ReturnType<typeof utcInstantFromEpochMs>
      message: string
      obscuredEmail: string
    }>()
    spyOn(TestBed.inject(AuthTransportService), 'registerUser').and.returnValue(response)
    fixture.detectChanges()
    fixture.nativeElement.querySelector('button[type="submit"]').click()
    response.next({
      statusCode: 200,
      timestamp: utcInstantFromEpochMs(0),
      message: 'Synthetic',
      obscuredEmail: 'a***@example.test',
    })
    response.complete()
    await fixture.whenStable()
    fixture.detectChanges()
    const heading: HTMLElement = fixture.nativeElement.querySelector('h2')
    expect(heading.textContent).toContain('Controlla la tua e-mail')
    expect(document.activeElement).toBe(heading)
    expect(fixture.nativeElement.querySelector('[role="status"] svg path')?.getAttribute('d')).toBe(
      accountFlowIcons.checkCircle
    )
    expect(fixture.nativeElement.querySelector('form')).toBeNull()
  })
})
