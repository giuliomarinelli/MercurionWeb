import { TestBed } from '@angular/core/testing';

import { LayoutContextService } from './layout-context.service';

describe('LayoutContextService', () => {
  let service: LayoutContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayoutContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
