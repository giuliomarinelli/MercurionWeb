import { TestBed } from '@angular/core/testing';

import { LoadingContextService } from './loading-context.service';

describe('LoadingContextService', () => {
  let service: LoadingContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
