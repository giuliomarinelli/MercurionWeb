import { TestBed } from '@angular/core/testing';

import { BindCollectionsToMoleculeContextService } from './bind-collections-to-molecule-context.service';
import { ActionOverlayContextService } from './action-overlay-context.service';

describe('BindCollectionsToMoleculeContextService', () => {
  let service: BindCollectionsToMoleculeContextService;
  let overlay: ActionOverlayContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BindCollectionsToMoleculeContextService);
    overlay = TestBed.inject(ActionOverlayContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('reflects only the current session moleculeId across reopenings', () => {
    overlay.open('BindCollectionsToMolecule', { moleculeId: 'mol-1', moleculeName: 'Ethanol' });
    expect(service.moleculeId()).toBe('mol-1');
    expect(service.moleculeName()).toBe('Ethanol');

    overlay.close();
    overlay.open('BindCollectionsToMolecule', { moleculeId: 'mol-2', moleculeName: 'Methanol' });
    expect(service.moleculeId()).toBe('mol-2');
    expect(service.moleculeName()).toBe('Methanol');
  });

  it('returns null once a different scope is active', () => {
    overlay.open('BindCollectionsToMolecule', { moleculeId: 'mol-1', moleculeName: 'Ethanol' });
    overlay.close();
    overlay.open('CreateCollection');

    expect(service.moleculeId()).toBeNull();
    expect(service.moleculeName()).toBeNull();
  });
});
