import { AccountService } from '../../services/account.service'
import { of } from 'rxjs'
import { utcInstantFromEpochMs } from '@mercurion/rest-contracts'
import { accountFlowIcons } from './account-flow-icons.testing'
import { type Type } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { RegisterPageComponent } from '../register/register.page.component'
import { ForgotPasswordPageComponent } from '../forgot-password/forgot-password.page.component'
import { PasswordRecoveryPageComponent } from '../password-recovery/password-recovery.page.component'
import { AccountRecoveryPageComponent } from '../account-recovery/account-recovery.page.component'
import { AccountActivatePageComponent } from '../account-activate/account-activate.page.component'
import { SsoPageComponent } from '../sso/sso.page.component'
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component'
import { LoginTurnstileStub } from './login-turnstile.testing'
import { FingerprintService } from '../../services/fingerprint.service'

const flows: { name: string; type: Type<unknown>; security?: boolean }[] = [
  { name: 'registration', type: RegisterPageComponent, security: true },
  { name: 'forgot password', type: ForgotPasswordPageComponent, security: true },
  { name: 'password reset', type: PasswordRecoveryPageComponent },
  { name: 'account recovery', type: AccountRecoveryPageComponent, security: true },
  { name: 'activation', type: AccountActivatePageComponent },
  { name: 'SSO callback', type: SsoPageComponent },
]

describe('Account flows responsive containment', () => {
  let fixture: ComponentFixture<unknown>
  let frame: HTMLIFrameElement
  afterEach(() => {
    fixture?.destroy()
    frame?.remove()
  })

  for (const flow of flows) {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 375, height: 320 },
      { width: 768, height: 720 },
      { width: 1280, height: 800 },
    ]) {
      it(`keeps ${flow.name} controls, security slot and outcomes contained at ${viewport.width}×${viewport.height}`, async () => {
        const config = TestBed.configureTestingModule({ imports: [flow.type] })
        if (flow.type === SsoPageComponent) {
          config.overrideProvider(FingerprintService, {
            useValue: {
              // Keep the spinner pending without collecting a real device fingerprint.
              getSanitizedFingerprint: () => new Promise<never>(() => {}),
            },
          })
        }
        if (flow.security) {
          config.overrideComponent(flow.type, {
            remove: { imports: [TurnstileComponent] },
            add: { imports: [LoginTurnstileStub] },
          })
        }
        await config.compileComponents()
        fixture = TestBed.createComponent(flow.type)
        fixture.detectChanges()
        if (fixture.componentInstance instanceof PasswordRecoveryPageComponent) {
          fixture.componentInstance.linkError.set(false)
          fixture.componentInstance.canView.set(true)
          fixture.detectChanges()
        }
        frame = document.createElement('iframe')
        frame.style.cssText = `width:${viewport.width}px;height:${viewport.height}px;border:0;display:block`
        document.body.appendChild(frame)
        const doc = frame.contentDocument!
        const style = doc.createElement('style')
        style.textContent = Array.from(document.styleSheets)
          .flatMap((sheet) => Array.from(sheet.cssRules).map((rule) => rule.cssText))
          .join('\n')
        doc.head.appendChild(style)
        doc.body.style.cssText = 'margin:0;box-sizing:border-box'
        doc.body.appendChild(fixture.nativeElement)
        const icon = (drawing: string, size: number) => {
          const path = Array.from(doc.querySelectorAll<SVGPathElement>('svg path')).find(
            (candidate) => candidate.getAttribute('d') === drawing
          )
          expect(path).withContext(`${flow.name}: original icon`).toBeDefined()
          const svg = path?.ownerSVGElement
          if (!svg) return
          const box = svg.getBoundingClientRect()
          expect(box.width).withContext('icon width').toBeCloseTo(size, 0)
          expect(box.height).withContext('icon height').toBeCloseTo(size, 0)
          expect(getComputedStyle(svg).display).not.toBe('none')
          expect(getComputedStyle(svg).visibility).toBe('visible')
          expect(svg.getAttribute('aria-hidden')).toBe('true')
          if (
            viewport.width >= 640 &&
            [accountFlowIcons.checkCircle, accountFlowIcons.information].some(
              (original) => original === drawing
            )
          ) {
            const copy = svg.parentElement?.querySelector('p')
            expect(copy).withContext('icon explanation').not.toBeNull()
            const text = copy!.getBoundingClientRect()
            expect(text.left - box.right)
              .withContext('icon/copy horizontal gap')
              .toBeGreaterThanOrEqual(11)
            expect(text.left - box.right)
              .withContext('icon/copy horizontal gap')
              .toBeLessThanOrEqual(17)
          }
        }
        const contains = () => {
          const main = doc.querySelector('main, [role="main"]')
          expect(main).withContext('semantic main region').not.toBeNull()
          const sentence = main!.textContent!.replace(/\s+/g, ' ')
          expect(sentence)
            .withContext('no detached punctuation after inline links or emphasis')
            .not.toMatch(/\s+[,.](?:\s|$)/)

          expect(doc.documentElement.scrollWidth)
            .withContext(flow.name)
            .toBeLessThanOrEqual(doc.documentElement.clientWidth)
          for (const node of doc.querySelectorAll('input, button, a, h1, h2')) {
            const box = node.getBoundingClientRect()
            expect(box.left)
              .withContext(node.textContent ?? node.tagName)
              .toBeGreaterThanOrEqual(-1)
            expect(box.right)
              .withContext(node.textContent ?? node.tagName)
              .toBeLessThanOrEqual(doc.documentElement.clientWidth + 1)
          }
        }
        if (
          flow.type === ForgotPasswordPageComponent ||
          flow.type === PasswordRecoveryPageComponent
        ) {
          icon(accountFlowIcons.information, 64)
        }
        if (flow.type === AccountRecoveryPageComponent) {
          icon(accountFlowIcons.warning, 48)
          expect(
            doc
              .querySelector('a[href="mailto:mercurion.app@gmail.com"] svg path')
              ?.getAttribute('d')
          ).toBe(accountFlowIcons.assistance)
          expect(
            doc.querySelector('.auth-support a[href="/login"] svg path')?.getAttribute('d')
          ).toBe(accountFlowIcons.login)
        }
        contains()
        if (fixture.componentInstance instanceof RegisterPageComponent) {
          const checkbox = doc.querySelector<HTMLInputElement>('#onlyKnown')!
          const consent = doc.querySelector<HTMLElement>('.auth-consent')!
          const tick = consent.querySelector<SVGSVGElement>('svg')!
          // Preserve the original 16px control and centre its original 14px tick.
          const marker = consent.querySelector<HTMLElement>('label span[aria-hidden="true"]')
          const visualBox = marker ?? checkbox
          for (const theme of ['light', 'dark']) {
            doc.documentElement.classList.toggle('dark', theme === 'dark')
            expect(getComputedStyle(checkbox).cursor).toBe('pointer')
            expect(getComputedStyle(consent.querySelector('label')!).cursor).toBe('pointer')
            expect(getComputedStyle(tick).display).toBe('none')
            const paint = doc.createElement('canvas').getContext('2d')!
            paint.fillStyle = getComputedStyle(visualBox).backgroundColor
            paint.fillRect(0, 0, 1, 1)
            const background = Array.from(paint.getImageData(0, 0, 1, 1).data)
            expect(background.slice(0, 3))
              .withContext(`${theme}: original white surface`)
              .toEqual([255, 255, 255])
            expect(background[3])
              .withContext(`${theme}: surface opacity`)
              .toBe(theme === 'dark' ? 13 : 255)
            checkbox.click()
            fixture.detectChanges()
            expect(fixture.componentInstance.acceptCtrl.value).toBeTrue()
            expect(getComputedStyle(tick).display).not.toBe('none')
            paint.clearRect(0, 0, 1, 1)
            paint.fillStyle = getComputedStyle(visualBox).backgroundColor
            paint.fillRect(0, 0, 1, 1)
            const selected = paint.getImageData(0, 0, 1, 1).data
            expect(selected[2]).withContext('selected blue control').toBeGreaterThan(selected[0])
            expect(selected[3]).withContext('visible selected fill').toBeGreaterThanOrEqual(200)
            const box = visualBox.getBoundingClientRect()
            const glyph = tick.getBoundingClientRect()
            expect(box.width).withContext('original checkbox width').toBe(16)
            expect(box.height).withContext('original checkbox height').toBe(16)
            expect(glyph.width).withContext('original tick size').toBe(14)
            expect(Math.abs(glyph.x + glyph.width / 2 - box.x - box.width / 2))
              .withContext('tick horizontal centring')
              .toBeLessThanOrEqual(0.5)
            expect(Math.abs(glyph.y + glyph.height / 2 - box.y - box.height / 2))
              .withContext('tick vertical centring')
              .toBeLessThanOrEqual(0.5)
            expect(tick.querySelector('path')?.getAttribute('d')).toBe('M3 8L6 11L11 3.5')
            expect(getComputedStyle(tick.querySelector('path')!).stroke).toBe('rgb(255, 255, 255)')
            expect(getComputedStyle(visualBox, '::after').content).toMatch(/^(none|normal)$/)
            checkbox.click()
            fixture.detectChanges()
            expect(fixture.componentInstance.acceptCtrl.value).toBeFalse()
          }
          doc.documentElement.classList.remove('dark')
        }
        if (flow.security) {
          const slot = doc.querySelector('.auth-security-slot') as HTMLElement
          expect(slot.getBoundingClientRect().width).toBe(300)
          expect(slot.clientHeight).toBeGreaterThanOrEqual(78)
          expect(getComputedStyle(slot.parentElement!).overflowX).toBe('visible')
        }
        const component = fixture.componentInstance
        if (component instanceof RegisterPageComponent) {
          component.step.set(2)
          component.obscuredEmail.set('a***@example.test')
        }
        if (component instanceof AccountRecoveryPageComponent) {
          component.step.set(3)
          component.recoveryCode.set('SYNTHETIC-'.repeat(12))
        }
        if (component instanceof AccountActivatePageComponent) {
          component.loading.set(false)
          component.canView.set(true)
          component.recoveryCode.set('SYNTHETIC-'.repeat(12))
        }
        if (component instanceof PasswordRecoveryPageComponent) {
          component.step.set(2)
          component.serverError.set(true)
          component.serverErrorMsg.set('Non è stato possibile completare la richiesta. Riprova.')
        }
        fixture.detectChanges()
        if (
          component instanceof RegisterPageComponent ||
          component instanceof AccountActivatePageComponent
        ) {
          icon(accountFlowIcons.checkCircle, 80)
        }
        if (component instanceof ForgotPasswordPageComponent) {
          spyOn(TestBed.inject(AccountService), 'sendForgottenPasswordLink').and.returnValue(
            of({
              statusCode: 200,
              timestamp: utcInstantFromEpochMs(0),
              message: 'Synthetic',
              obscuredEmail: 'a***@example.test',
            })
          )
          component.requestForm.setValue({ email: 'person@example.test' })
          component.onTurnstileToken('synthetic-challenge')
          component.send()
          fixture.detectChanges()
          icon(accountFlowIcons.checkCircle, 64)
        }
        if (component instanceof PasswordRecoveryPageComponent)
          icon(accountFlowIcons.checkCircle, 64)
        if (component instanceof AccountRecoveryPageComponent) {
          icon(accountFlowIcons.checkCircle, 48)
          icon(accountFlowIcons.warning, 48)
        }
        if (component instanceof AccountActivatePageComponent) {
          icon(
            accountFlowIcons.account,
            viewport.width >= 1024 ? 40 : viewport.width >= 768 ? 32 : 28
          )
        }
        contains()
        if (component instanceof AccountRecoveryPageComponent) {
          component.step.set(2)
          fixture.detectChanges()
          contains()
          icon(accountFlowIcons.warning, 48)
        }
      })
    }
  }
})
