import { TestBed } from '@angular/core/testing';

import { MoleculeService } from './molecule.service';

describe('MoleculeService', () => {
  let service: MoleculeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoleculeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
