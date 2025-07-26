import { TestBed } from '@angular/core/testing';

import { RDKitService } from './rd-kit-loader.service';

describe('RDKitLoaderService', () => {
  let service: RDKitService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RDKitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
