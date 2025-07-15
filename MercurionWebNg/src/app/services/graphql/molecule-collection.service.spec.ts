import { TestBed } from '@angular/core/testing';

import { MoleculeCollectionService } from './molecule-collection.service';

describe('MoleculeCollectionService', () => {
  let service: MoleculeCollectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoleculeCollectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
