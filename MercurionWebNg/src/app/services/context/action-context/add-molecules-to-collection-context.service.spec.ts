import { TestBed } from '@angular/core/testing';

import { AddMoleculesToCollectionContextService } from './add-molecules-to-collection-context.service';

describe('AddMoleculesToCollectionContextService', () => {
  let service: AddMoleculesToCollectionContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AddMoleculesToCollectionContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
