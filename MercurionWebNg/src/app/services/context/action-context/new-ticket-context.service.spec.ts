import { TestBed } from '@angular/core/testing';

import { NewTicketContextService } from './new-ticket-context.service';

describe('NewTicketContextService', () => {
  let service: NewTicketContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewTicketContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
