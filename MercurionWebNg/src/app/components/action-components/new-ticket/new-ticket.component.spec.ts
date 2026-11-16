import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Subject, of } from 'rxjs'
import { NewTicketComponent } from './new-ticket.component'
import { HelpService } from '../../../services/graphql/help.service'
import { ClientTicket } from '../../../Models/graphql/help.models'
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service'
import { DomainInvalidationService } from '../../../services/domain-invalidation.service'
import { blockingViolations, runAxe } from '../../../testing/accessibility-test.helpers.spec'

const created = { id: 'ticket-qa' } as ClientTicket

describe('NewTicketComponent submission', () => {
  let component: NewTicketComponent
  let fixture: ComponentFixture<NewTicketComponent>
  let help: { createTicket: jasmine.Spy }
  let overlay: ActionOverlayContextService
  let editorReady: Promise<void>

  beforeEach(async () => {
    help = { createTicket: jasmine.createSpy('createTicket') }
    help.createTicket.and.returnValue(of(created))
    TestBed.configureTestingModule({
      imports: [NewTicketComponent],
      providers: [{ provide: HelpService, useValue: help }],
    })
    overlay = TestBed.inject(ActionOverlayContextService)
    overlay.open('NewTicket', { innerScope: 'User' })
    fixture = TestBed.createComponent(NewTicketComponent)
    component = fixture.componentInstance
    editorReady = new Promise(resolve => {
      const configure = component.configureEditor.bind(component)
      spyOn(component, 'configureEditor').and.callFake(editor => {
        configure(editor)
        resolve()
      })
    })
    fixture.detectChanges()
    await fixture.whenStable()
  })

  function compose() {
    component.subject = '  Una domanda  '
    component.contentHtml = '<p>Testo completo</p>'
    const event = {
      content: { ops: [{ insert: 'Testo completo\n' }] },
      delta: { ops: [{ retain: 5 }, { insert: ' completo' }] },
      text: 'Testo completo\n',
    }
    component.onChanged(event)
  }

  it('sends the complete document instead of the last incremental change', () => {
    compose()
    component.createTicket()
    expect(help.createTicket).toHaveBeenCalledWith(
      'Una domanda', '<p>Testo completo</p>', { ops: [{ insert: 'Testo completo\n' }] },
    )
  })

  it('retains the draft and reports an unconfirmed result without closing', () => {
    help.createTicket.and.returnValue(of(null as unknown as ClientTicket))
    const close = spyOn(overlay, 'close').and.callThrough()
    compose()
    component.createTicket()
    fixture.detectChanges()
    expect(close).not.toHaveBeenCalled()
    expect(component.contentHtml).toBe('<p>Testo completo</p>')
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('serializes submissions and prevents component close while pending', () => {
    const response = new Subject<ClientTicket>()
    help.createTicket.and.returnValue(response)
    const close = spyOn(overlay, 'close').and.callThrough()
    compose()
    component.createTicket()
    component.createTicket()
    component.close()
    expect(help.createTicket).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()
    response.next(created)
    response.complete()
    expect(overlay.scope()).toBe('TicketDetail')
  })

  it('does not replace a newer overlay when an older response arrives', () => {
    const response = new Subject<ClientTicket>()
    help.createTicket.and.returnValue(response)
    compose()
    component.createTicket()
    overlay.open('NewTicket', { innerScope: 'User' })
    response.next(created)
    expect(overlay.scope()).toBe('NewTicket')
  })

  it('keeps a transport failure visible and preserves all input for a deliberate retry', () => {
    const response = new Subject<ClientTicket>()
    help.createTicket.and.returnValue(response)
    compose()
    component.createTicket()
    response.error(new Error('network'))
    fixture.detectChanges()
    expect(component.loading()).toBe(false)
    expect(component.subject).toBe('  Una domanda  ')
    expect(component.contentHtml).toBe('<p>Testo completo</p>')
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('non confermato')
  })

  it('does not publish success or open detail after destruction', () => {
    const response = new Subject<ClientTicket>()
    help.createTicket.and.returnValue(response)
    const invalidation = spyOn(TestBed.inject(DomainInvalidationService), 'publish')
    compose()
    component.createTicket()
    fixture.destroy()
    response.next(created)
    expect(invalidation).not.toHaveBeenCalled()
    expect(overlay.scope()).toBe('NewTicket')
  })
  it('labels the actual rich-text input and every toolbar button', async () => {
    await editorReady
    await fixture.whenStable()
    const root = fixture.nativeElement as HTMLElement
    const editor = root.querySelector('.ql-editor')
    expect(editor?.getAttribute('role')).toBe('textbox')
    expect(editor?.getAttribute('aria-labelledby')).toBe('new-ticket-message-label')
    const buttons = [...root.querySelectorAll('.ql-toolbar button')]
    expect(buttons.length).toBe(8)
    expect(buttons.every(button => !!button.getAttribute('aria-label'))).toBe(true)
  })

  it('has no serious accessibility violations after the actual editor is ready', async () => {
    await editorReady
    const result = await runAxe(fixture.nativeElement as HTMLElement)
    expect(blockingViolations(result)).toEqual([])
  })

})
