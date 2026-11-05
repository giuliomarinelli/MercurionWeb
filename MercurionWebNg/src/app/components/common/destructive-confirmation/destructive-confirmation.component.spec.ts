import { TestBed } from '@angular/core/testing'
import { DestructiveConfirmationComponent } from './destructive-confirmation.component'

describe('DestructiveConfirmationComponent', () => {
  it('labels the consequences and blocks dismissal and repeat confirmation while pending', async () => {
    const fixture = TestBed.createComponent(DestructiveConfirmationComponent)
    fixture.componentRef.setInput('title', 'Elimina elemento?')
    fixture.componentRef.setInput('description', 'Verrà eliminato da tutte le collezioni.')
    fixture.componentRef.setInput('open', true)
    const cancel = jasmine.createSpy('cancel')
    const confirm = jasmine.createSpy('confirm')
    fixture.componentInstance.cancelled.subscribe(cancel)
    fixture.componentInstance.confirmed.subscribe(confirm)
    fixture.detectChanges()
    await fixture.whenStable()
    const host = document.body.querySelector('[data-destructive-dialog-outlet]') as HTMLElement
    expect(host.parentElement).toBe(document.body)
    expect(fixture.nativeElement.querySelector('[role=dialog]')).toBeNull()
    const dialog = host.querySelector('[role=dialog]') as HTMLElement
    expect(dialog.getAttribute('aria-describedby')).toBe(fixture.componentInstance.descriptionId)
    expect(dialog.querySelector('button[cdkFocusInitial]')?.textContent).toContain('Annulla')
    fixture.componentRef.setInput('pending', true)
    fixture.detectChanges()
    fixture.componentInstance.cancel()
    fixture.componentInstance.confirm()
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(cancel).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    fixture.componentRef.setInput('pending', false)
    fixture.detectChanges()
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(cancel).toHaveBeenCalledTimes(1)
    fixture.destroy()
    expect(document.body.querySelector('[data-destructive-dialog-outlet]')).toBeNull()
  })
})
