import { TestBed } from '@angular/core/testing';
import { CustomMoleculeCollectionItemSaveContextService } from './custom-molecule-collection-item-save-context.service';
import { ActionOverlayContextService } from './action-overlay-context.service';

describe('MoleculeCollectionItemSaveContextService', () => {
  let service: CustomMoleculeCollectionItemSaveContextService;
  let overlay: ActionOverlayContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomMoleculeCollectionItemSaveContextService);
    overlay = TestBed.inject(ActionOverlayContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('reflects only the current session mode/smiles across reopenings', () => {
    overlay.open('MoleculeCollectionItemSave', { mode: 'edit', smiles: 'CCO' });
    expect(service.mode()).toBe('edit');
    expect(service.smiles()).toBe('CCO');

    overlay.close();
    overlay.open('MoleculeCollectionItemSave', { mode: 'duplicate', smiles: 'CCN' });
    expect(service.mode()).toBe('duplicate');
    expect(service.smiles()).toBe('CCN');
  });

  it('auto-resets session-scoped selection state when a new session opens, without callers calling reset manually', () => {
    overlay.open('MoleculeCollectionItemSave', { mode: 'edit', smiles: 'CCO' });
    TestBed.tick();

    service.selectedCollectionId.set('col-1');
    service.searchTerm.set('acid');
    service.page.set(3);

    expect(service.selectedCollectionId()).toBe('col-1');
    expect(service.searchTerm()).toBe('acid');
    expect(service.page()).toBe(3);

    overlay.close();
    overlay.open('MoleculeCollectionItemSave', { mode: 'edit', smiles: 'CCN' });
    TestBed.tick();

    expect(service.selectedCollectionId()).toBeNull();
    expect(service.searchTerm()).toBe('');
    expect(service.page()).toBe(1);
  });
});


