import { TestBed } from '@angular/core/testing'
import { TicketToolbarComponent } from './ticket-toolbar.component'

describe('TicketToolbarComponent keyboard continuity', () => {
  it('focuses the replacement command after reopening a ticket', async () => {
    TestBed.configureTestingModule({ imports: [TicketToolbarComponent] })
    const fixture = TestBed.createComponent(TicketToolbarComponent)
    fixture.componentRef.setInput('capabilities', { canClose: false, canReopen: true, canSend: false, showRequester: true })
    fixture.detectChanges()
    const original = fixture.nativeElement.querySelector('button') as HTMLButtonElement
    original.focus()
    original.click()
    fixture.componentRef.setInput('pending', true)
    fixture.detectChanges()
    fixture.componentRef.setInput('capabilities', { canClose: true, canReopen: false, canSend: true, showRequester: true })
    fixture.componentRef.setInput('pending', false)
    fixture.detectChanges()
    await fixture.whenStable()
    const replacement = fixture.nativeElement.querySelector('button') as HTMLButtonElement
    expect(replacement).not.toBe(original)
    expect(document.activeElement).toBe(replacement)
    expect(replacement.textContent).toContain('Chiudi ticket')
  })
})
