import { TestBed } from '@angular/core/testing';

import { SaveToCollectionContextService } from './save-to-collection-context.service';

describe('SaveToCollectionContextService', () => {
  let service: SaveToCollectionContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaveToCollectionContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
