import { TestBed } from '@angular/core/testing';

import { SearchMoleculeService } from './search-molecule.service';

describe('SearchMoleculeService', () => {
  let service: SearchMoleculeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchMoleculeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
