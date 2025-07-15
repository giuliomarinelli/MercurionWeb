import { TestBed } from '@angular/core/testing';

import { MoleculeCollectionJoinService } from './molecule-collection-join.service';

describe('MoleculeCollectionJoinService', () => {
  let service: MoleculeCollectionJoinService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoleculeCollectionJoinService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
