import { TestBed } from '@angular/core/testing';

import { BindCollectionsToMoleculeContextService } from './bind-collections-to-molecule-context.service';

describe('BindCollectionsToMoleculeContextService', () => {
  let service: BindCollectionsToMoleculeContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BindCollectionsToMoleculeContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
