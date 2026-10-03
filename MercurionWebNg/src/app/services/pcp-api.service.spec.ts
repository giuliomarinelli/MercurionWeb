import { TestBed } from '@angular/core/testing';

import { PcpApiService } from './pcp-api.service';

describe('PcpApiService', () => {
  let service: PcpApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PcpApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
