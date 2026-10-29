import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Subject, of, throwError } from 'rxjs'
import { HelpPageComponent } from './help.page.component'
import { HelpService } from '../../services/graphql/help.service'
import { ClientTicket } from '../../Models/graphql/help.models'
import { PageModel } from '../../Models/graphql/page.models'
import { AuthSessionRepository } from '../../services/auth-session-repository.service'

export function ticketFixture(id: string, status: ClientTicket['status'] = 'Open'): ClientTicket {
  return { id, publicId: 'MTCK-000000123', subject: 'Richiesta di assistenza', status,
    createdAt: '1793278800000', updatedAt: '1793278800000', lastMessageAt: '1793278800000' }
}

function pageOf(items: ClientTicket[], page = 1, totalPages = 1): PageModel<ClientTicket> {
  return { items, currentPage: page, totalPages, totalItems: 50, itemCount: items.length, itemsPerPage: 25 }
}

describe('HelpPageComponent list states', () => {
  let fixture: ComponentFixture<HelpPageComponent>
  let component: HelpPageComponent
  let help: { myTickets: jasmine.Spy; ticketsAsSupport: jasmine.Spy; closeMyTicket: jasmine.Spy; closeTicketAsSupport: jasmine.Spy; reopenTicketAsSupport: jasmine.Spy }

  beforeEach(async () => {
    help = jasmine.createSpyObj('Help', ['myTickets', 'ticketsAsSupport', 'closeMyTicket', 'closeTicketAsSupport', 'reopenTicketAsSupport'])
    help.myTickets.and.returnValue(of(pageOf([ticketFixture('a'), ticketFixture('b', 'Closed')])))
    help.ticketsAsSupport.and.returnValue(of(pageOf([])))
    help.closeMyTicket.and.returnValue(of(true))
    TestBed.configureTestingModule({
      imports: [HelpPageComponent],
      providers: [
        { provide: HelpService, useValue: help },
        { provide: AuthSessionRepository, useValue: { getCachedScopes: () => [], getUserScopesFromClaims: () => [] } },
      ],
    })
    fixture = TestBed.createComponent(HelpPageComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  })

  async function settle() {
    await fixture.whenStable()
    fixture.detectChanges()
  }

  it('filters only loaded records and restores all without a new request', async () => {
    component.filter.set('open')
    fixture.detectChanges()
    expect(component.visibleItems().map(item => item.id)).toEqual(['a'])
    expect(fixture.nativeElement.textContent).toContain('soltanto i ticket già caricati')
    component.filter.set('all')
    fixture.detectChanges()
    expect(component.visibleItems().length).toBe(2)
    expect(help.myTickets).toHaveBeenCalledTimes(1)
  })

  it('does not present a filtered page as globally empty or hide loading more', async () => {
    help.myTickets.and.callFake((page: number) => of(pageOf([ticketFixture(page === 1 ? 'closed' : 'next', page === 1 ? 'Closed' : 'Open')], page, 2)))
    component.resetPagination()
    await settle()
    component.filter.set('open')
    fixture.detectChanges()
    expect(fixture.nativeElement.textContent).toContain('Nessuna richiesta non chiusa tra quelle caricate')
    expect(fixture.nativeElement.textContent).toContain('Carica altri ticket')
    await component.loadMore()
    fixture.detectChanges()
    expect(component.visibleItems().map(item => item.id)).toEqual(['next'])
    expect(component.items.length).toBe(2)
  })

  it('keeps first-page errors distinct from an empty list', async () => {
    help.myTickets.and.returnValue(throwError(() => new Error('network')))
    component.resetPagination()
    await settle()
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Non è stato possibile')
    expect(fixture.nativeElement.textContent).not.toContain('Le tue richieste saranno raccolte qui')
    help.myTickets.and.returnValue(of(pageOf([ticketFixture('retry')])))
    component.retryPagination()
    await settle()
    expect(component.items[0].id).toBe('retry')
  })

  it('serializes a close request and exposes errors without discarding rows', () => {
    const close = new Subject<boolean>()
    help.closeMyTicket.and.returnValue(close)
    component.onCloseFromCard('a')
    component.onCloseFromCard('a')
    expect(help.closeMyTicket).toHaveBeenCalledTimes(1)
    expect(component.pendingActions()['a']).toBe(true)
    close.error(new Error('network'))
    fixture.detectChanges()
    expect(component.items.length).toBe(2)
    expect(component.pendingActions()['a']).toBe(false)
    expect(component.actionErrors()['a']).toContain('Impossibile confermare')
  })

  it('applies a confirmed close to the active client filter', () => {
    component.filter.set('open')
    component.onCloseFromCard('a')
    fixture.detectChanges()
    expect(component.items.find(item => item.id === 'a')?.status).toBe('Closed')
    expect(component.visibleItems().length).toBe(0)
  })

  it('does not expose support operations to an ordinary user', () => {
    component.onReopenFromCard('b')
    component.switchTab(1)
    expect(component.activeTab()).toBe(0)
    expect(help.reopenTicketAsSupport).not.toHaveBeenCalled()
    expect(help.ticketsAsSupport).not.toHaveBeenCalled()
  })
  it('deduplicates overlapping pages without resetting the active filter', async () => {
    help.myTickets.and.callFake((page: number) => of(pageOf([ticketFixture('same')], page, 2)))
    component.resetPagination()
    await settle()
    component.filter.set('open')
    await component.loadMore()
    fixture.detectChanges()
    expect(component.items.length).toBe(1)
    expect(component.visibleItems().length).toBe(1)
    expect(component.filter()).toBe('open')
  })

})
