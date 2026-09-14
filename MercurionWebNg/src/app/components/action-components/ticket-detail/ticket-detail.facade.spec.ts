import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { TicketDetailFacade } from './ticket-detail.facade';
import { TicketDetailContextService } from '../../../services/context/action-context/ticket-detail-context.service';
import { HelpService } from '../../../services/graphql/help.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { ClientTicket, ClientTicketMessage, Ticket, TicketMessage } from '../../../Models/graphql/help.models';

describe('TicketDetailFacade', () => {
  const ticketId = signal('ticket-1');
  const scope = signal<'User' | 'Support'>('User');
  let help: jasmine.SpyObj<HelpService>;
  let facade: TicketDetailFacade;

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
        { provide: DomainInvalidationService, useValue: { publish: jasmine.createSpy('publish') } },
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
    facade.reload();
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
    facade.retrySubmit();
    state = facade.state();
    if (state.kind === 'content') expect(state.composer.kind).toBe('idle');
    expect(help.addTicketMessage.calls.count()).toBe(2);
  });

  it('cancels an in-flight submit and removes its optimistic message', () => {
    help.addTicketMessage.and.returnValue(new Subject<boolean>());
    facade.submit({ html: '<p>Hello</p>', delta: null });
    facade.cancelSubmit();
    const state = facade.state();
    if (state.kind !== 'content') return;
    expect(state.composer.kind).toBe('idle');
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
});
