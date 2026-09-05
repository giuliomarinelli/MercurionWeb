import { TestBed } from '@angular/core/testing';

import { NewTicketContextService } from './new-ticket-context.service';
import { ActionOverlayContextService } from './action-overlay-context.service';

describe('NewTicketContextService', () => {
  let service: NewTicketContextService;
  let overlay: ActionOverlayContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewTicketContextService);
    overlay = TestBed.inject(ActionOverlayContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('owns its own innerScope input and never borrows a stale TicketDetail value', () => {
    overlay.open('TicketDetail', { ticketId: 'tkt-1', innerScope: 'Support' });
    overlay.close();

    overlay.open('NewTicket', { innerScope: 'User' });
    expect(service.innerScope()).toBe('User');
  });

  it('reflects only the current session innerScope across reopenings', () => {
    overlay.open('NewTicket', { innerScope: 'User' });
    expect(service.innerScope()).toBe('User');

    overlay.close();
    overlay.open('NewTicket', { innerScope: 'Support' });
    expect(service.innerScope()).toBe('Support');
  });
});
