import { TestBed } from '@angular/core/testing';

import { MoleculeJoinService } from './molecule-collection-join.service';

describe('MoleculeJoinService', () => {
  let service: MoleculeJoinService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoleculeJoinService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
