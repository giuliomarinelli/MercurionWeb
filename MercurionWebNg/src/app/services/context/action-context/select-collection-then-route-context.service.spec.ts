import { TestBed } from '@angular/core/testing';

import { SelectCollectionThenRouteContextService } from './select-collection-then-route-context.service';

describe('SelectCollectionThenRouteContextService', () => {
  let service: SelectCollectionThenRouteContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SelectCollectionThenRouteContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
