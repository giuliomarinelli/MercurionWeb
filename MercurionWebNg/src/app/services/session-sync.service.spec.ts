import { TestBed } from '@angular/core/testing';

import { SessionSyncService } from './session-sync.service';

describe('SessionSyncService', () => {
  let service: SessionSyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
