import { TestBed } from '@angular/core/testing';

import { RdKitApiService } from './rd-kit-api.service';

describe('RdKitApiService', () => {
  let service: RdKitApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RdKitApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
