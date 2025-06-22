import { TestBed } from '@angular/core/testing';

import { MoleculeSearchService } from './molecule-search.service';

describe('MoleculeSearchService', () => {
  let service: MoleculeSearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoleculeSearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
