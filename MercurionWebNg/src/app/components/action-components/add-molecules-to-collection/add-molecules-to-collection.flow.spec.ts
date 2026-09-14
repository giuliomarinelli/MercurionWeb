import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  AddMoleculesSearchController,
  AddMoleculesSelectionController,
  AddMoleculesSubmitController
} from './add-molecules-to-collection.flow';

describe('AddMoleculesSelectionController', () => {
  it('keeps identity selection across visible result changes', () => {
    const selection = new AddMoleculesSelectionController();
    selection.toggle('molecule-a', true);
    selection.toggle('molecule-b', true);

    expect(selection.isSelected('molecule-a')).toBeTrue();
    expect(selection.buildExistingMoleculePayload(['molecule-b', 'molecule-c'])).toEqual({
      itemIds: ['molecule-a', 'molecule-b'],
      selectAll: false
    });
  });

  it('deduplicates chips by identity and supports removal/reset', () => {
    const selection = new AddMoleculesSelectionController();
    selection.addChip({ id: '42', name: 'A' });
    selection.addChip({ id: '42', name: 'A duplicate' });
    expect(selection.selectedChemblIds).toEqual(['42']);

    selection.removeChip('42');
    expect(selection.selectedChemblIds).toEqual([]);
    selection.addChip({ id: '43', name: 'B' });
    selection.reset();
    expect(selection.selectedChemblIds).toEqual([]);
    expect(selection.isNothingSelected()).toBeTrue();
  });

  it('preserves select-all semantics while recording visible exclusions', () => {
    const selection = new AddMoleculesSelectionController();
    selection.selectAll();
    selection.toggle('molecule-b', false);

    expect(selection.buildExistingMoleculePayload(['molecule-a', 'molecule-b'])).toEqual({
      itemIds: ['molecule-b'],
      selectAll: true
    });
  });
});

describe('AddMoleculesSearchController', () => {
  it('clears short queries and reports search errors', fakeAsync(() => {
    const search = jasmine.createSpy('search').and.returnValue(
      throwError(() => new Error('search failed'))
    );
    const controller = new AddMoleculesSearchController(search);

    controller.setQuery('a');
    expect(controller.empty()).toBeTrue();
    controller.setQuery('benzene');

    tick(120);
    expect(search).toHaveBeenCalledWith('benzene');
    expect(controller.error()).toEqual(jasmine.any(Error));
    controller.destroy();
  }));
});

describe('AddMoleculesSubmitController', () => {
  it('builds and forwards the existing-molecule command payload', () => {
    const selection = new AddMoleculesSelectionController();
    selection.toggle('item-1', true);
    const service = {
      addManyMoleculesToCollection: jasmine.createSpy().and.returnValue(of(true)),
      addManyChEMBLItemsToCollection: jasmine.createSpy().and.returnValue(of(true))
    };
    const submit = new AddMoleculesSubmitController();

    submit.submitExisting(service, 'collection-1', selection, ['item-1']).subscribe();

    expect(service.addManyMoleculesToCollection).toHaveBeenCalledWith(
      'collection-1',
      ['item-1'],
      false
    );
  });

  it('isolates ChEMBL DTO creation from the component', () => {
    const selection = new AddMoleculesSelectionController();
    selection.addChip({ id: '17', name: 'benzene' });
    const service = {
      addManyMoleculesToCollection: jasmine.createSpy().and.returnValue(of(true)),
      addManyChEMBLItemsToCollection: jasmine.createSpy().and.returnValue(of(true))
    };
    new AddMoleculesSubmitController()
      .submitChembl(service, 'collection-1', selection)
      .subscribe();

    expect(service.addManyChEMBLItemsToCollection).toHaveBeenCalledWith('collection-1', [
      { chemblMolregno: 17, name: 'benzene' }
    ]);
  });
});
