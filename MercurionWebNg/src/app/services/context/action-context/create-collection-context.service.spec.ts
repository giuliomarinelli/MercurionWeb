import { TestBed } from '@angular/core/testing';

import { CreateCollectionContextService } from './create-collection-context.service';

describe('CreateCollectionContextService', () => {
  let service: CreateCollectionContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreateCollectionContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
