import { TestBed } from '@angular/core/testing';

import { AddMoleculesToCollectionContextService } from './add-molecules-to-collection-context.service';
import { ActionOverlayContextService } from './action-overlay-context.service';

describe('AddMoleculesToCollectionContextService', () => {
  let service: AddMoleculesToCollectionContextService;
  let overlay: ActionOverlayContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AddMoleculesToCollectionContextService);
    overlay = TestBed.inject(ActionOverlayContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('reflects the current session input and never leaks a previous opening payload into a later one', () => {
    overlay.open('AddMoleculesToCollection', { collectionId: 'col-1', redirectToCollectionPath: false, importFromChembl: false });
    expect(service.collectionId()).toBe('col-1');
    expect(service.redirectToCollectionPath()).toBe(false);
    expect(service.importFromChembl()).toBe(false);

    overlay.close();
    overlay.open('AddMoleculesToCollection', { collectionId: 'col-2', redirectToCollectionPath: true, importFromChembl: true });

    expect(service.collectionId()).toBe('col-2');
    expect(service.redirectToCollectionPath()).toBe(true);
    expect(service.importFromChembl()).toBe(true);
  });

  it('falls back to defaults once a different scope becomes active', () => {
    overlay.open('AddMoleculesToCollection', { collectionId: 'col-1', redirectToCollectionPath: true, importFromChembl: true });
    overlay.close();
    overlay.open('CreateCollection');

    expect(service.collectionId()).toBeNull();
    expect(service.redirectToCollectionPath()).toBe(false);
    expect(service.importFromChembl()).toBe(false);
  });
});
