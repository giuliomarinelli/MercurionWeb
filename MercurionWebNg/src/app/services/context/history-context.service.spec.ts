import { TestBed } from '@angular/core/testing';

import { HistoryContextService } from './history-context.service';

describe('HistoryService', () => {
  let service: HistoryContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HistoryContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
