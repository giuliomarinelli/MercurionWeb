import { TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { signal, Type } from '@angular/core'
import { of } from 'rxjs'
import { FeedbackPageComponent } from './feedback.page.component'
import { ContactsPageComponent } from '../contacts/contacts.page.component'
import { PrivacyPageComponent } from '../privacy/privacy.page.component'
import { TermsAndPoliciesPageComponent } from '../terms-and-policies/terms-and-policies.page.component'
import { StatusPageComponent } from '../status-page/status-page.component'
import { STATUS_PAGE_CONFIG } from '../status-page/status-page.models'
import { FeedbackService } from '../../services/feedback.service'
import { UserContextService } from '../../services/context/user-context.service'
import { blockingViolations, formatAxeViolations, runAxe } from '../../testing/accessibility-test.helpers.spec'

const surfaces: Type<unknown>[] = [FeedbackPageComponent, ContactsPageComponent, PrivacyPageComponent, TermsAndPoliciesPageComponent, StatusPageComponent]

for (const theme of ['light', 'dark']) {
  describe(`Complementary pages in ${theme}`, () => {
    let originalDark: boolean
    beforeEach(() => {
      originalDark = document.documentElement.classList.contains('dark')
      document.documentElement.classList.toggle('dark', theme === 'dark')
      document.body.style.backgroundColor = 'var(--m-color-surface-main)'
      TestBed.configureTestingModule({ imports: surfaces, providers: [
        { provide: FeedbackService, useValue: { createFeedback: () => of({ id: 'qa-feedback' }) } },
        { provide: UserContextService, useValue: { isLoggedIn: signal(false) } },
      ] })
      TestBed.inject(ActivatedRoute).snapshot.data['statusPage'] = STATUS_PAGE_CONFIG[403]
    })
    afterEach(() => {
      document.documentElement.classList.toggle('dark', originalDark)
      document.body.style.backgroundColor = ''
    })

    it('has no horizontal overflow at narrow, tablet and desktop widths', async () => {
      for (const surface of surfaces) {
        const fixture = TestBed.createComponent(surface)
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()
        const host = fixture.nativeElement as HTMLElement
        const parent = host.parentElement ?? document.body
        const frame = document.createElement('iframe')
        frame.style.cssText = 'position:fixed;top:0;left:0;height:320px;border:0'
        document.body.append(frame)
        try {
          const doc = frame.contentDocument!
          doc.documentElement.classList.toggle('dark', theme === 'dark')
          doc.body.style.margin = '0'
          const style = doc.createElement('style')
          style.textContent = [...document.styleSheets].flatMap(sheet => {
            try { return [...sheet.cssRules].map(rule => rule.cssText) } catch { return [] }
          }).join('\n')
          doc.head.append(style)
          doc.body.append(host)
          for (const width of [320, 375, 640, 768, 1280]) {
            frame.style.width = `${width}px`
            expect(doc.documentElement.scrollWidth).withContext(`${surface.name} ${width}px`).toBeLessThanOrEqual(width + 1)
            if (surface === StatusPageComponent) {
              const main = host.querySelector('main')!
              expect(frame.contentWindow!.getComputedStyle(main).position).not.toBe('absolute')
              const buttons = [...host.querySelectorAll<HTMLButtonElement>('button')]
              expect(buttons.length).toBe(2)
              expect(buttons.every(button => button.getBoundingClientRect().right <= width + 1)).toBeTrue()
            }
          }
        } finally {
          parent.append(host)
          frame.remove()
          fixture.destroy()
        }
      }
    })

    it('preserves accessible names, semantics and contrast', async () => {
      for (const surface of surfaces) {
        const fixture = TestBed.createComponent(surface)
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()
        const violations = blockingViolations(await runAxe(fixture.nativeElement))
        expect(violations.length).withContext(`${surface.name}: ${formatAxeViolations(violations)}`).toBe(0)
        fixture.destroy()
      }
    })
  })
}
