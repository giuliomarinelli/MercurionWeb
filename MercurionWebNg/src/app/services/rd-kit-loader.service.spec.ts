import { TestBed } from '@angular/core/testing';

import { RDKitLoaderService } from './rd-kit-loader.service';

describe('RDKitLoaderService', () => {
  let service: RDKitLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RDKitLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
