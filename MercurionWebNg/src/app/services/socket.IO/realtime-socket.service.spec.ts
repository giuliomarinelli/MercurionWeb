import { TestBed } from '@angular/core/testing';

import { RealtimeSocketService } from './realtime-socket.service';

describe('RealtimeSocketService', () => {
  let service: RealtimeSocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RealtimeSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
