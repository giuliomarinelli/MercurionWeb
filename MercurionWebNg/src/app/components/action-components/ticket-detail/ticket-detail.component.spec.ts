import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { of, Subject } from 'rxjs'
import { TicketDetailComponent } from './ticket-detail.component'
import { TicketDetailFacade } from './ticket-detail.facade'
import { HelpService } from '../../../services/graphql/help.service'
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service'
import { TicketComposerComponent } from '../../support/ticket-composer/ticket-composer.component'

const ticket = {
  id: 'qa-ticket', publicId: 'MTCK-QA22', subject: 'Conversazione di prova', status: 'Open',
  createdAt: '1793260800000', updatedAt: '1793260800000', lastMessageAt: '1793260800000',
}
const messages = { items: [], currentPage: 1, totalPages: 1, totalItems: 0, itemCount: 0, itemsPerPage: 10 }

describe('TicketDetailComponent workflow', () => {
  let fixture: ComponentFixture<TicketDetailComponent>
  let overlay: ActionOverlayContextService
  let response: Subject<boolean>
  let help: { myTicketDetail: jasmine.Spy; myTicketMessages: jasmine.Spy; addTicketMessage: jasmine.Spy; closeMyTicket: jasmine.Spy }

  beforeEach(async () => {
    response = new Subject<boolean>()
    help = {
      myTicketDetail: jasmine.createSpy().and.returnValue(of(ticket)),
      myTicketMessages: jasmine.createSpy().and.returnValue(of(messages)),
      addTicketMessage: jasmine.createSpy().and.returnValue(response),
      closeMyTicket: jasmine.createSpy().and.returnValue(of(false)),
    }
    TestBed.configureTestingModule({
      imports: [TicketDetailComponent], providers: [{ provide: HelpService, useValue: help }],
    })
    overlay = TestBed.inject(ActionOverlayContextService)
    overlay.open('TicketDetail', { ticketId: ticket.id, innerScope: 'User' })
    await new Promise(resolve => setTimeout(resolve, 20))
    fixture = TestBed.createComponent(TicketDetailComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  })

  function composer(): TicketComposerComponent {
    return fixture.debugElement.query(By.directive(TicketComposerComponent)).componentInstance
  }

  function send() {
    composer().contentHtml = '<p>Risposta completa</p>'
    composer().onChanged({ content: { ops: [{ insert: 'Risposta completa\n' }] }, text: 'Risposta completa' })
    composer().sendMsg()
    fixture.detectChanges()
  }

  it('locks close and editor while pending, then preserves the failed draft', async () => {
    send()
    expect(overlay.state().phase).toBe('submitting')
    expect(fixture.nativeElement.querySelector('[aria-label="Chiudi dettaglio ticket"]').disabled).toBeTrue()
    expect(composer().pending()).toBeTrue()
    response.next(false)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(overlay.state().phase).toBe('failed')
    expect(composer().contentHtml).toContain('Risposta completa')
    expect(fixture.nativeElement.textContent).toContain('Invio non confermato')
  })

  it('keeps the same composer and draft mounted during a refresh', () => {
    const original = composer()
    original.contentHtml = '<p>Bozza locale</p>'
    const delayed = new Subject<typeof ticket>()
    help.myTicketDetail.and.returnValue(delayed)
    fixture.debugElement.injector.get(TicketDetailFacade).refresh()
    fixture.detectChanges()
    expect(composer()).toBe(original)
    expect(composer().contentHtml).toContain('Bozza locale')
    delayed.next(ticket)
    delayed.complete()
    fixture.detectChanges()
    expect(composer()).toBe(original)
  })

  it('clears only the confirmed draft and permits the next send in the same overlay session', async () => {
    send()
    response.next(true)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    expect(overlay.state().phase).toBe('succeeded')
    expect(composer().contentHtml).toBe('')
    response = new Subject<boolean>()
    help.addTicketMessage.and.returnValue(response)
    send()
    expect(overlay.state().phase).toBe('submitting')
    expect(help.addTicketMessage.calls.count()).toBe(2)
  })
})
