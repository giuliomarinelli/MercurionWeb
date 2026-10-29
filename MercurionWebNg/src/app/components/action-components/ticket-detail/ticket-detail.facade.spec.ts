import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { TicketDetailFacade } from './ticket-detail.facade';
import { TicketDetailContextService } from '../../../services/context/action-context/ticket-detail-context.service';
import { HelpService } from '../../../services/graphql/help.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { ClientTicket, ClientTicketMessage, Ticket, TicketMessage } from '../../../Models/graphql/help.models';
import { DomainInvalidation } from '../../../services/domain-invalidation.service'

describe('TicketDetailFacade', () => {
  const ticketId = signal('ticket-1');
  const scope = signal<'User' | 'Support'>('User');
  let help: jasmine.SpyObj<HelpService>;
  let facade: TicketDetailFacade;
  let event: ReturnType<typeof signal<DomainInvalidation | null>>

  const ticket = (id: string, status: 'Open' | 'Closed' = 'Open') => ({
    id, publicId: id, subject: `Subject ${id}`, status,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    lastMessageAt: '2026-01-01T00:00:00.000Z',
  }) as unknown as ClientTicket;
  const message = (id: string) => ({
    id, publicId: id, ticketId: 'ticket-1', authorType: 'User', contentDelta: '{}',
    contentHtml: `<p>${id}</p>`, createdAt: '2026-01-01T00:00:00.000Z',
  }) as unknown as ClientTicketMessage;
  const page = <T>(items: T[], currentPage = 1, totalPages = 2) => ({
    items, currentPage, totalPages, totalItems: items.length, itemCount: items.length, itemsPerPage: 10
  });

  beforeEach(() => {
    ticketId.set('ticket-1');
    scope.set('User');
    event = signal<DomainInvalidation | null>(null)
    help = jasmine.createSpyObj<HelpService>('HelpService', [
      'myTicketDetail', 'ticketDetailAsSupport', 'myTicketMessages', 'ticketMessagesAsSupport',
      'addTicketMessage', 'addSupportTicketMessage', 'closeMyTicket', 'closeTicketAsSupport', 'reopenTicketAsSupport'
    ]);
    help.myTicketDetail.and.returnValue(of(ticket('ticket-1')));
    help.myTicketMessages.and.returnValue(of(page([message('m1')])));
    TestBed.configureTestingModule({
      providers: [
        TicketDetailFacade,
        { provide: TicketDetailContextService, useValue: { ticketId, innerScope: scope } },
        { provide: HelpService, useValue: help },
        { provide: DomainInvalidationService, useValue: { last: event, publish: jasmine.createSpy('publish') } },
      ],
    });
    facade = TestBed.inject(TicketDetailFacade);
    TestBed.flushEffects();
  });

  afterEach(() => facade.destroy());

  it('loads detail and the first message page into one content state', () => {
    const state = facade.state();
    expect(state.kind).toBe('content');
    if (state.kind !== 'content') return;
    expect(state.ticket.id).toBe('ticket-1');
    expect(state.messages.map(item => item.id)).toEqual(['m1']);
    expect(state.thread.page).toBe(2);
    expect(state.capabilities).toEqual({ canClose: true, canReopen: false, canSend: true, showRequester: false });
  });

  it('cancels stale detail work and clears prior ticket state when context changes', () => {
    const delayed = new Subject<ClientTicket>();
    help.myTicketDetail.and.returnValues(delayed, of(ticket('ticket-2')));
    facade.reload();
    ticketId.set('ticket-2');
    TestBed.flushEffects();
    delayed.next(ticket('stale'));
    const state = facade.state();
    expect(state.kind).toBe('content');
    if (state.kind === 'content') expect(state.ticket.id).toBe('ticket-2');
  });

  it('keeps paging errors retryable and independent from detail state', () => {
    help.myTicketMessages.and.returnValue(throwError(() => new Error('offline')));
    facade.loadMore();
    let state = facade.state();
    expect(state.kind).toBe('content');
    if (state.kind === 'content') expect(state.thread.error).toBeTruthy();
    help.myTicketMessages.and.returnValue(of(page<ClientTicketMessage>([], 1, 1)));
    facade.retryPage();
    state = facade.state();
    if (state.kind === 'content') expect(state.thread.done).toBeTrue();
  });

  it('supports deterministic submit failure and retry', () => {
    help.addTicketMessage.and.returnValues(throwError(() => new Error('offline')), of(true));
    facade.submit({ html: '<p>Hello</p>', delta: { ops: [{ insert: 'Hello' }] } });
    let state = facade.state();
    if (state.kind === 'content') expect(state.composer.kind).toBe('error');
    facade.submit({ html: '<p>Hello</p>', delta: { ops: [{ insert: 'Hello' }] } });
    state = facade.state();
    if (state.kind === 'content') expect(state.composer.kind).toBe('idle');
    expect(help.addTicketMessage.calls.count()).toBe(2);
  });

  it('unsubscribes an in-flight submit when the panel is destroyed', () => {
    help.addTicketMessage.and.returnValue(new Subject<boolean>());
    facade.submit({ html: '<p>Hello</p>', delta: null });
    facade.destroy();
    const state = facade.state();
    if (state.kind !== 'content') return;
    expect(state.composer.kind).toBe('pending');
    expect(state.messages.some(item => item.id.startsWith('optimistic-'))).toBeFalse();
  });

  it('maps support capabilities for a closed ticket', () => {
    scope.set('Support');
    help.ticketDetailAsSupport.and.returnValue(of(ticket('ticket-1', 'Closed') as unknown as Ticket));
    help.ticketMessagesAsSupport.and.returnValue(of(page<TicketMessage>([], 1, 1)));
    TestBed.flushEffects();
    const state = facade.state();
    if (state.kind !== 'content') return;
    expect(state.capabilities).toEqual({ canClose: false, canReopen: true, canSend: false, showRequester: true });
  });

  it('advances past an overlapping page even when every message is already loaded', () => {
    help.myTicketMessages.and.returnValue(of(page([message('m1')], 2, 3)))
    facade.loadMore()
    const state = facade.state()
    if (state.kind !== 'content') throw new Error('Expected content')
    expect(state.thread.page).toBe(3)
    expect(state.messages.map(item => item.id)).toEqual(['m1'])
  })

  it('reports a failed status command instead of silently ignoring it', () => {
    help.closeMyTicket.and.returnValue(throwError(() => new Error('offline')))
    facade.closeTicket()
    const state = facade.state()
    expect('commandError' in state && state.commandError).toBeTruthy()
  })

  it('serializes sends and clears a draft only on confirmed success', () => {
    const response = new Subject<boolean>()
    help.addTicketMessage.and.returnValue(response)
    const draft = { html: '<p>Bozza</p>', delta: { ops: [{ insert: 'Bozza\n' }] } }
    facade.submit(draft)
    facade.submit(draft)
    expect(help.addTicketMessage.calls.count()).toBe(1)
    let state = facade.state()
    if (state.kind !== 'content') throw new Error('Expected content')
    expect(state.sentRevision).toBe(0)
    response.next(true)
    state = facade.state()
    if (state.kind !== 'content') throw new Error('Expected content')
    expect(state.sentRevision).toBe(1)
    expect(state.messages.some(item => item.id.startsWith('optimistic-'))).toBeFalse()
  })

  it('refreshes in place on a remote update without cancelling an in-flight send', async () => {
    const send = new Subject<boolean>()
    const detail = new Subject<ClientTicket>()
    help.addTicketMessage.and.returnValue(send)
    help.myTicketDetail.and.returnValue(detail)
    facade.submit({ html: '<p>Bozza</p>', delta: { ops: [{ insert: 'Bozza' }] } })
    event.set({ domain: 'ticket', action: 'changed', resourceId: 'ticket-1', remote: true })
    TestBed.flushEffects()
    await Promise.resolve()
    const state = facade.state()
    if (state.kind !== 'content') throw new Error('Content must stay mounted')
    expect(state.composer.kind).toBe('pending')
    expect(send.observed).toBeTrue()
    detail.next(ticket('ticket-1'))
    detail.complete()
    send.next(false)
    const failed = facade.state()
    if (failed.kind !== 'content') throw new Error('Expected content')
    expect(failed.composer.kind).toBe('error')
    expect(failed.sentRevision).toBe(0)
  })

  it('keeps existing messages available when refresh fails', () => {
    help.myTicketDetail.and.returnValue(throwError(() => new Error('offline')))
    facade.refresh()
    const state = facade.state()
    if (state.kind !== 'content') throw new Error('Expected retained content')
    expect(state.messages.map(item => item.id)).toEqual(['m1'])
    expect(state.refreshError).toBeTruthy()
  })

  it('keeps chronological order while filling pages displaced by new arrivals', () => {
    const dated = (id: string, time: number) => ({ ...message(id), createdAt: String(Date.parse('2026-01-01T00:00:00.000Z') + time) })
    help.myTicketMessages.and.returnValue(of(page([dated('newest', 3000)], 1, 3)))
    facade.refresh()
    help.myTicketMessages.and.returnValue(of(page([dated('middle', 2000)], 2, 3)))
    facade.loadMore()
    const state = facade.state()
    if (state.kind !== 'content') throw new Error('Expected content')
    expect(state.messages.map(item => item.id)).toEqual(['m1', 'middle', 'newest'])
  })

  it('does not cancel commands in a new ticket when an old command completes', () => {
    const response = new Subject<boolean>()
    help.closeMyTicket.and.returnValue(response)
    facade.closeTicket()
    ticketId.set('ticket-2')
    help.myTicketDetail.and.returnValue(of(ticket('ticket-2')))
    TestBed.flushEffects()
    expect(response.observed).toBeFalse()
    response.next(true)
    const state = facade.state()
    if (state.kind !== 'content') throw new Error('Expected content')
    expect(state.ticket.id).toBe('ticket-2')
    expect(state.ticket.status).toBe('Open')
    expect(state.commandPending).toBeFalse()
  })
});
