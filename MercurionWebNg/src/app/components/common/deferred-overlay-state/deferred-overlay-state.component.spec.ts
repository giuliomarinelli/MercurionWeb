import { TestBed } from '@angular/core/testing'
import { DeferredOverlayStateComponent } from './deferred-overlay-state.component'
import { blockingViolations, formatAxeViolations, runAxe } from '../../../testing/accessibility-test.helpers.spec'

for (const theme of ['light', 'dark']) {
  describe(`DeferredOverlayStateComponent in ${theme}`, () => {
    let originalDark: boolean
    beforeEach(() => {
      originalDark = document.documentElement.classList.contains('dark')
      document.documentElement.classList.toggle('dark', theme === 'dark')
      TestBed.configureTestingModule({ imports: [DeferredOverlayStateComponent] })
    })
    afterEach(() => document.documentElement.classList.toggle('dark', originalDark))

    it('announces loading and errors without issuing a reload before an explicit click', async () => {
      const fixture = TestBed.createComponent(DeferredOverlayStateComponent)
      fixture.componentRef.setInput('label', 'Ricerca molecolare')
      const reload = jasmine.createSpy('reload')
      const closed = jasmine.createSpy('closed')
      fixture.componentInstance.reloadRequested.subscribe(reload)
      fixture.componentInstance.closed.subscribe(closed)
      fixture.detectChanges()
      await fixture.whenStable()
      expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull()
      fixture.componentRef.setInput('failed', true)
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull()
      expect(reload).not.toHaveBeenCalled()
      const violations = blockingViolations(await runAxe(fixture.nativeElement))
      expect(violations.length).withContext(formatAxeViolations(violations)).toBe(0)
      const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[]
      buttons.find(button => button.textContent?.includes('Ricarica'))!.click()
      expect(reload).toHaveBeenCalledTimes(1)
      buttons.find(button => button.getAttribute('aria-label') === 'Chiudi pannello')!.click()
      expect(closed).toHaveBeenCalledTimes(1)
      fixture.componentRef.setInput('open', false)
      fixture.detectChanges()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      expect(closed).toHaveBeenCalledTimes(1)
    })
  })
}
