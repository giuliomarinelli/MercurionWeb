import { TestBed } from '@angular/core/testing';

import { MoleculeCollectionItemService } from './molecule-collection-item.service';

describe('MoleculeCollectionItemService', () => {
  let service: MoleculeCollectionItemService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoleculeCollectionItemService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
