import { TestBed } from '@angular/core/testing';
import { CustomMoleculeCollectionItemSaveContextService } from './custom-molecule-collection-item-save-context.service';



describe('MoleculeCollectionItemSaveContextService', () => {
  let service: CustomMoleculeCollectionItemSaveContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomMoleculeCollectionItemSaveContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
