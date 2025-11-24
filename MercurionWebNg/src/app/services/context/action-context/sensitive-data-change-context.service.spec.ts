import { TestBed } from '@angular/core/testing';

import { SensitiveDataChangeContextService } from './sensitive-data-change-context.service';

describe('SensitiveDataChangeContextService', () => {
  let service: SensitiveDataChangeContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SensitiveDataChangeContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
