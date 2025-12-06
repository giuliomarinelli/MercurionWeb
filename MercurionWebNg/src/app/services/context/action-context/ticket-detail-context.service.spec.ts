import { TestBed } from '@angular/core/testing';

import { TicketDetailContextService } from './ticket-detail-context.service';

describe('TicketDetailContextService', () => {
  let service: TicketDetailContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TicketDetailContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
