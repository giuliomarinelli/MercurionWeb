import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { of, Subject } from 'rxjs'
import { utcInstantFromEpochMs, ConfirmDTO, ConfirmMfaChange } from '@mercurion/rest-contracts'
import { SensitiveDataChangeWorkflowComponent } from './sensitive-data-change-workflow.component'
import { SensitiveDataChangeFacade } from './sensitive-data-change-facade.service'
import { SensitiveDataChangeContextService } from '../../../services/context/action-context/sensitive-data-change-context.service'
import { CountryService } from '../../../services/country.service'

const confirmation: ConfirmDTO = {
  statusCode: 200,
  timestamp: utcInstantFromEpochMs(0),
  message: 'Synthetic',
}
const challenge = (): ConfirmMfaChange => ({
  ...confirmation,
  timestamp: utcInstantFromEpochMs(Date.now()),
  generatedAt: utcInstantFromEpochMs(Date.now()),
  expiresAt: utcInstantFromEpochMs(Date.now() + 30_000),
  secureToken: 'synthetic-token',
  secret: 'JBSWY3DPEHPK3PXP',
  otpauthUrl: 'otpauth://totp/Synthetic?secret=JBSWY3DPEHPK3PXP',
  qrCode:
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/%3E',
})

describe('Settings MFA workflow outcomes', () => {
  let fixture: ComponentFixture<SensitiveDataChangeWorkflowComponent>
  let start: Subject<ConfirmMfaChange>
  let verify: Subject<ConfirmDTO>
  let backup: Subject<string[]>
  let commands: jasmine.SpyObj<SensitiveDataChangeFacade>

  beforeEach(async () => {
    start = new Subject()
    verify = new Subject()
    backup = new Subject()
    commands = jasmine.createSpyObj('SensitiveDataChangeFacade', [
      'getMaskedAccountId',
      'getMaskedPhone',
      'getEnabledMfaStrategies',
      'getRemainingBackupCodes',
      'enableMfaFirstStep',
      'enableMfaSecondStep',
      'disableMfaFirstStep',
      'disableMfaSecondStep',
      'getBackupCodes',
    ])
    commands.getMaskedAccountId.and.returnValue(of('a***@example.test'))
    commands.getMaskedPhone.and.returnValue(of('+39******01'))
    commands.getEnabledMfaStrategies.and.returnValue(of([]))
    commands.getRemainingBackupCodes.and.returnValue(of(0))
    commands.enableMfaFirstStep.and.returnValue(start)
    commands.enableMfaSecondStep.and.returnValue(verify)
    commands.disableMfaFirstStep.and.returnValue(start)
    commands.disableMfaSecondStep.and.returnValue(verify)
    commands.getBackupCodes.and.returnValue(backup)
    await TestBed.configureTestingModule({
      imports: [SensitiveDataChangeWorkflowComponent],
      providers: [
        { provide: SensitiveDataChangeFacade, useValue: commands },
        {
          provide: SensitiveDataChangeContextService,
          useValue: { innerScope: signal('ConfigMfa') },
        },
        { provide: CountryService, useValue: { getAllPhonePrefixes: () => of([]) } },
      ],
    }).compileComponents()
    fixture = TestBed.createComponent(SensitiveDataChangeWorkflowComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  })

  async function enterCode(strategy: 'EMAIL_OTP' | 'APP_TOTP' = 'EMAIL_OTP') {
    fixture.componentInstance.handleEnableMfa(strategy)
    start.next(challenge())
    start.complete()
    await fixture.whenStable()
    fixture.detectChanges()
    if (strategy === 'APP_TOTP') {
      fixture.componentInstance.routeAction()
      fixture.detectChanges()
    }
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="text"]')
    input.value = '123456'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    fixture.detectChanges()
    return input
  }

  it('prevents overlapping requests and duplicate keyboard verification', async () => {
    fixture.componentInstance.handleEnableMfa('EMAIL_OTP')
    fixture.componentInstance.handleEnableMfa('EMAIL_OTP')
    expect(commands.enableMfaFirstStep).toHaveBeenCalledTimes(1)
    start.next(challenge())
    start.complete()
    await fixture.whenStable()
    fixture.detectChanges()
    fixture.componentInstance.otpCtrl.setValue('123456')
    fixture.componentInstance.routeAction()
    fixture.componentInstance.routeAction()
    expect(commands.enableMfaSecondStep).toHaveBeenCalledTimes(1)
  })

  it('does not show a required error when the new OTP field receives initial focus', async () => {
    fixture.componentInstance.handleEnableMfa('EMAIL_OTP')
    start.next(challenge())
    start.complete()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(fixture.componentInstance.otpCtrl.touched).toBeFalse()
    expect(fixture.nativeElement.textContent).not.toContain('Il codice monouso è obbligatorio.')
  })

  it('uses mobile OTP semantics and offers a deliberate resend with a new authorization token', async () => {
    const input = await enterCode()
    expect(input.autocomplete).toBe('one-time-code')
    expect(input.inputMode).toBe('numeric')
    expect(document.activeElement).toBe(input)
    const resend = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.includes('Invia di nuovo'))
    expect(resend).toBeDefined()
    const next = new Subject<ConfirmMfaChange>()
    commands.enableMfaFirstStep.and.returnValue(next)
    resend?.click()
    next.next({ ...challenge(), secureToken: 'replacement-token' })
    next.complete()
    await fixture.whenStable()
    fixture.detectChanges()
    fixture.componentInstance.otpCtrl.setValue('654321')
    fixture.componentInstance.routeAction()
    expect(commands.enableMfaSecondStep).toHaveBeenCalledWith(
      'EMAIL_OTP',
      '654321',
      'replacement-token'
    )
  })

  it('reports successful activation separately from a failure to retrieve backup codes', async () => {
    await enterCode()
    fixture.componentInstance.routeAction()
    verify.next(confirmation)
    verify.complete()
    backup.error(new HttpErrorResponse({ status: 500 }))
    await fixture.whenStable()
    fixture.detectChanges()
    expect(fixture.componentInstance.serverError()).toBe(0)
    expect(fixture.nativeElement.textContent).toContain('è stata attivata con successo')
    expect(
      fixture.nativeElement.querySelector('[data-backup-codes-warning]')?.textContent
    ).toContain('codici di backup')
    expect(commands.enableMfaSecondStep).toHaveBeenCalledTimes(1)
  })

  for (const status of [401, 429]) {
    it(`keeps an explicit recovery action after verification status ${status}`, async () => {
      await enterCode()
      fixture.componentInstance.routeAction()
      verify.error(new HttpErrorResponse({ status }))
      await fixture.whenStable()
      fixture.detectChanges()
      expect(fixture.componentInstance.serverError()).toBe(status)
      const restart = Array.from(
        fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
      ).find((button) => button.textContent?.includes('Ricomincia'))
      expect(restart).toBeDefined()
      restart?.click()
      await fixture.whenStable()
      fixture.detectChanges()
      expect(fixture.componentInstance.enableMfaStep()).toBe('CHOOSE_STRATEGY')
      expect(commands.enableMfaSecondStep).toHaveBeenCalledTimes(1)
    })
  }

  it('does not restore an app secret or QR through a queued callback after destruction', async () => {
    fixture.componentInstance.handleEnableMfa('APP_TOTP')
    start.next(challenge())
    fixture.destroy()
    await Promise.resolve()
    expect(fixture.componentInstance.appSecret()).toBe('')
    expect(fixture.componentInstance.qrCode()).toBe('')
  })

  it('discards a queued app setup immediately on cancel, before host destruction', async () => {
    fixture.componentInstance.handleEnableMfa('APP_TOTP')
    start.next(challenge())
    fixture.componentInstance.close()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(fixture.componentInstance.appSecret()).toBe('')
    expect(fixture.componentInstance.qrCode()).toBe('')
    expect(fixture.nativeElement.textContent).not.toContain(challenge().secret!)
  })

  it('returns to the same app setup without sending or creating another secret', async () => {
    await enterCode('APP_TOTP')
    expect(fixture.nativeElement.querySelector('m-otp-challenge-clock')).toBeNull()
    expect(fixture.nativeElement.textContent).not.toContain('Invia di nuovo')
    fixture.componentInstance.previousStep()
    fixture.detectChanges()
    expect(fixture.componentInstance.enableMfaStep()).toBe('APP:SCAN_QR_CODE_OR_COPY_SECRET')
    expect(fixture.nativeElement.querySelector('img[alt="QR Code"]')?.getAttribute('src')).toBe(
      challenge().qrCode!
    )
    expect(fixture.componentInstance.appSecret()).toBe(challenge().secret!)
    expect(commands.enableMfaFirstStep).toHaveBeenCalledTimes(1)
  })

  it('removes the backup strategy too when the final primary method is disabled', async () => {
    commands.getEnabledMfaStrategies.and.returnValue(of(['EMAIL_OTP', 'BACKUP_CODE']))
    fixture.componentInstance.restartWorkflow()
    fixture.componentInstance.handleDisableMfa('EMAIL_OTP')
    start.next(challenge())
    start.complete()
    await fixture.whenStable()
    fixture.detectChanges()
    fixture.componentInstance.otpCtrl.setValue('123456')
    fixture.componentInstance.routeAction()
    verify.next(confirmation)
    verify.complete()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(commands.disableMfaSecondStep).toHaveBeenCalledOnceWith(
      'EMAIL_OTP',
      '123456',
      'synthetic-token'
    )
    expect(fixture.componentInstance.enabledMfaStrategies()).toEqual([])
    expect(fixture.nativeElement.textContent).toContain('disattivata con successo')
    expect(commands.getBackupCodes).not.toHaveBeenCalled()
  })

  it('keeps one-time backup codes visible after activation and clears them on restart', async () => {
    await enterCode()
    fixture.componentInstance.routeAction()
    verify.next(confirmation)
    verify.complete()
    backup.next(['synthetic-code-1', 'synthetic-code-2'])
    backup.complete()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('synthetic-code-1')
    expect(
      fixture.nativeElement.querySelector('[aria-label="Copia i codici di backup"]')
    ).not.toBeNull()
    expect(fixture.nativeElement.querySelector('svg path')).not.toBeNull()
    expect(commands.getBackupCodes).toHaveBeenCalledTimes(1)
    fixture.componentInstance.restartWorkflow()
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).not.toContain('synthetic-code-1')
    expect(commands.getBackupCodes).toHaveBeenCalledTimes(1)
  })

  it('leaves verification available after the displayed interval, since the server owns validity', async () => {
    fixture.componentInstance.handleEnableMfa('EMAIL_OTP')
    start.next({ ...challenge(), expiresAt: utcInstantFromEpochMs(0) })
    start.complete()
    await fixture.whenStable()
    fixture.detectChanges()
    fixture.componentInstance.otpCtrl.setValue('123456')
    fixture.detectChanges()
    const submit: HTMLButtonElement = fixture.nativeElement.querySelector(
      'm-button[action-footer-primary] button'
    )
    expect(fixture.nativeElement.textContent).toContain('Puoi richiedere un nuovo invio')
    expect(submit.disabled).toBeFalse()
    submit.click()
    expect(commands.enableMfaSecondStep).toHaveBeenCalledTimes(1)
  })

  it('keeps a failed initial catalog load recoverable without an empty chooser', async () => {
    const failed = new Subject<never>()
    commands.getEnabledMfaStrategies.and.returnValue(failed)
    fixture.componentInstance.restartWorkflow()
    failed.error(new HttpErrorResponse({ status: 503 }))
    await fixture.whenStable()
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull()
    expect(fixture.nativeElement.textContent).toContain('Ricomincia')
    expect(fixture.nativeElement.querySelector('m-mfa-strategy-card')).toBeNull()
  })

  it('accepts a matching strong password and rejects a weak one in the actual password form', () => {
    const form = fixture.componentInstance.passwordForm
    form.setValue({
      oldPassword: 'Synthetic-old1!',
      password: 'Synthetic-new2!',
      confirmPassword: 'Synthetic-new2!',
    })
    expect(form.valid).toBeTrue()
    form.controls.password.setValue('weak')
    expect(form.invalid).toBeTrue()
    expect(form.controls.password.hasError('pattern')).toBeTrue()
  })

  for (const width of [375, 640, 1280]) {
    for (const theme of ['light', 'dark']) {
      it(`fits QR, OTP, loading and backup results in a short ${width}px ${theme} viewport`, async () => {
        await enterCode('APP_TOTP')
        fixture.componentInstance.previousStep()
        fixture.detectChanges()
        const frame = document.createElement('iframe')
        frame.style.cssText = `position:fixed;top:0;left:0;width:${width}px;height:430px;border:0`
        document.body.appendChild(frame)
        const root = fixture.nativeElement as HTMLElement
        const parent = root.parentElement!
        try {
          const doc = frame.contentDocument!
          doc.documentElement.classList.toggle('dark', theme === 'dark')
          doc.body.style.margin = '0'
          const style = doc.createElement('style')
          style.textContent = Array.from(document.styleSheets)
            .flatMap((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText))
            .join('\n')
          doc.head.appendChild(style)
          doc.body.appendChild(root)

          const checkGeometry = (state: string) => {
            const card = doc.querySelector('.m-action-card') as HTMLElement
            const body = doc.querySelector('.m-action-card__body') as HTMLElement
            expect(card.getBoundingClientRect().width).withContext(state).toBeLessThanOrEqual(width)
            expect(card.scrollWidth)
              .withContext(`${state}: card overflow`)
              .toBeLessThanOrEqual(card.clientWidth + 1)
            expect(body.scrollWidth)
              .withContext(`${state}: body overflow`)
              .toBeLessThanOrEqual(body.clientWidth + 1)
            expect(card.getBoundingClientRect().height).withContext(state).toBeLessThanOrEqual(430)
          }
          checkGeometry('QR and manual secret')
          fixture.componentInstance.routeAction()
          fixture.detectChanges()
          checkGeometry('OTP')
            const field = doc.querySelector('m-text-field') as HTMLElement
            const panel = field.closest('.relative.rounded-lg.border') as HTMLElement
            const notice = panel.parentElement!.previousElementSibling as HTMLElement
            expect(panel.getBoundingClientRect().top - notice.getBoundingClientRect().bottom)
              .withContext('OTP panel must be separated from its instructions')
              .toBeGreaterThanOrEqual(16)
          fixture.componentInstance.otpCtrl.setValue('123456')
          fixture.componentInstance.routeAction()
          fixture.detectChanges()
          checkGeometry('pending verification')
          const reserved = doc.querySelector('.sensitive-data-body') as HTMLElement
          expect(reserved.getBoundingClientRect().height).toBeGreaterThanOrEqual(172)
          verify.next(confirmation)
          verify.complete()
          backup.next(['synthetic-backup-code-1', 'synthetic-backup-code-2'])
          backup.complete()
          await fixture.whenStable()
          fixture.detectChanges()
          checkGeometry('backup codes and success')
          expect(doc.querySelector('[aria-label="Copia i codici di backup"]')).not.toBeNull()
        } finally {
          parent.appendChild(root)
          frame.remove()
        }
      })
    }
  }
})
