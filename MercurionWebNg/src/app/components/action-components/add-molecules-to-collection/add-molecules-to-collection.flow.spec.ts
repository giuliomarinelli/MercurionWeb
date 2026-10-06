import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
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
    expect(selection.buildExistingMoleculePayload()).toEqual({
      itemIds: ['molecule-a', 'molecule-b'],
      selectAll: false,
      snapshotAt: null
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

    expect(selection.buildExistingMoleculePayload()).toEqual({
      itemIds: ['molecule-b'],
      selectAll: true,
      snapshotAt: jasmine.any(String) as unknown as string
    });
  });

  it('selects future pages and preserves exclusions after the visible datasource changes', () => {
    const selection = new AddMoleculesSelectionController();
    selection.selectAll();
    expect(selection.isSelected('not-loaded-yet')).toBeTrue();
    expect(selection.isPartiallySelected()).toBeFalse();
    selection.toggle('no-longer-visible', false);

    expect(selection.isSelected('another-page')).toBeTrue();
    expect(selection.isSelected('no-longer-visible')).toBeFalse();
    expect(selection.isPartiallySelected()).toBeTrue();
    expect(selection.buildExistingMoleculePayload().itemIds).toEqual(['no-longer-visible']);

    selection.clearVisibleSelection();
    expect(selection.isSelected('another-page')).toBeFalse();
    expect(selection.isNothingSelected()).toBeTrue();
  });
});

describe('AddMoleculesSearchController', () => {
  it('cancels old responses immediately on query changes and clear, and deduplicates identical queries', fakeAsync(() => {
    const old = new Subject<never[]>();
    const current = new Subject<never[]>();
    const search = jasmine.createSpy('search').and.returnValues(old, current);
    const controller = new AddMoleculesSearchController(search);
    controller.setQuery('aspirin'); tick(100);
    controller.setQuery('caffeine');
    old.next([{} as never]);
    expect(controller.results()).toEqual([]);
    expect(controller.loading()).toBeTrue();
    controller.setQuery('caffeine'); tick(100);
    expect(search.calls.count()).toBe(2);
    controller.clear(); current.next([{} as never]);
    expect(controller.results()).toEqual([]); expect(controller.empty()).toBeTrue(); expect(controller.loading()).toBeFalse();
    controller.destroy();
  }));
  it('retries the same failed query without changing the selected draft', fakeAsync(() => {
    const search = jasmine.createSpy('search').and.returnValues(throwError(() => new Error('network')), of([]));
    const controller = new AddMoleculesSearchController(search);
    controller.setQuery('aspirin'); tick(100); expect(controller.error()).toBeTruthy();
    controller.retry(); expect(controller.loading()).toBeTrue(); tick(100);
    expect(search.calls.count()).toBe(2); expect(controller.error()).toBeNull(); expect(controller.empty()).toBeFalse();
    controller.destroy();
  }));
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

    submit.submitExisting(service, 'collection-1', selection).subscribe();

    expect(service.addManyMoleculesToCollection).toHaveBeenCalledWith(
      'collection-1',
      ['item-1'],
      false,
      null
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
