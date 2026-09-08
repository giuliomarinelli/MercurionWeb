import { TestBed } from '@angular/core/testing';

import { TicketDetailContextService } from './ticket-detail-context.service';
import { ActionOverlayContextService } from './action-overlay-context.service';

describe('TicketDetailContextService', () => {
  let service: TicketDetailContextService;
  let overlay: ActionOverlayContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TicketDetailContextService);
    overlay = TestBed.inject(ActionOverlayContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('reflects only the current session ticketId/innerScope across reopenings', () => {
    overlay.open('TicketDetail', { ticketId: 'tkt-1', innerScope: 'User' });
    expect(service.ticketId()).toBe('tkt-1');
    expect(service.innerScope()).toBe('User');

    overlay.close();
    overlay.open('TicketDetail', { ticketId: 'tkt-2', innerScope: 'Support' });
    expect(service.ticketId()).toBe('tkt-2');
    expect(service.innerScope()).toBe('Support');
  });

  it('does not leak a previous TicketDetail session into a NewTicket opening', () => {
    overlay.open('TicketDetail', { ticketId: 'tkt-1', innerScope: 'Support' });
    overlay.close();
    overlay.open('NewTicket', { innerScope: 'User' });

    expect(service.ticketId()).toBe('');
    expect(service.innerScope()).toBe('User');
  });
});
