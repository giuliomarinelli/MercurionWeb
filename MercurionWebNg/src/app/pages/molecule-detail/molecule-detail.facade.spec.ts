import {
  mapMoleculeDetail,
  MoleculeDetailViewModel,
  MoleculeDetailFacade
} from './molecule-detail.facade';
import { Observable, Subject, of } from 'rxjs';
import { signal } from '@angular/core';
import type { MoleculeDetailItem } from '../../Models/graphql/molecule-collection/molecule-collection.types';
import type { TypeGuardsService } from '../../services/type-guards.service';

describe('mapMoleculeDetail', () => {
  const typeGuards = {
    isSystemMolecule: (item: MoleculeDetailItem) => item.type === 'system',
    isChemblMolecule: (item: MoleculeDetailItem) => item.type === 'chembl'
  } as unknown as Pick<TypeGuardsService, 'isSystemMolecule' | 'isChemblMolecule'>;

  function map(item: MoleculeDetailItem): MoleculeDetailViewModel {
    return mapMoleculeDetail(item, typeGuards);
  }

  it('normalizes system molecules without collection metadata', () => {
    const viewModel = map({
      type: 'system',
      id: 42,
      preferredName: 'System molecule',
      canonicalSmiles: 'C',
      cmbId: 123,
      properties: { molecularWeight: 12 },
      administrationRoutes: [],
      synonyms: []
    } as unknown as MoleculeDetailItem);

    expect(viewModel.kind).toBe('system');
    expect(viewModel.id).toBe('42');
    expect(viewModel.name).toBe('System molecule');
    expect(viewModel.joins).toEqual([]);
    expect(Object.isFrozen(viewModel)).toBe(true);
  });

  it('normalizes ChEMBL molecules and preserves collection metadata', () => {
    const viewModel = map({
      type: 'chembl',
      id: 'chembl-item',
      chemblMolregno: 77,
      joins: [{ id: 'join-1', collection: {} }],
      label: 'Known',
      notes: 'Notes',
      chemblDetails: {
        preferredName: 'ChEMBL molecule',
        canonicalSmiles: 'CC',
        cmbId: 'CHEMBL77',
        properties: {},
        administrationRoutes: [],
        synonyms: []
      }
    } as unknown as MoleculeDetailItem);

    expect(viewModel.kind).toBe('chembl');
    expect(viewModel.id).toBe('chembl-item');
    expect(viewModel.name).toBe('ChEMBL molecule');
    expect(viewModel.chemblId).toBe('CHEMBL77');
    expect((viewModel.joins as unknown[]).length).toBe(1);
    expect(viewModel.label).toBe('Known');
  });

  it('normalizes custom molecules and decodes persisted properties', () => {
    const viewModel = map({
      type: 'custom',
      id: 'custom-item',
      name: 'Custom molecule',
      canonicalSmiles: 'CCC',
      propertiesJson: '{"molecularWeight": 44}',
      joins: [],
      label: null,
      notes: null
    } as unknown as MoleculeDetailItem);

    expect(viewModel.kind).toBe('custom');
    expect(viewModel.name).toBe('Custom molecule');
    expect(viewModel.properties).toEqual({ molecularWeight: 44 });
    expect(viewModel.administrationRoutes).toEqual([]);
    expect(viewModel.synonyms).toEqual([]);
  });
});

describe('MoleculeDetailFacade persisted properties', () => {
  const item = {
    type: 'custom', id: 'custom-item', name: 'Cyclohexane', canonicalSmiles: 'C1CCCCC1',
    propertiesJson: '{"molecularWeight":84.162,"hBondDonors":0}', joins: []
  } as unknown as MoleculeDetailItem;

  function infer(loggedIn: boolean, inference: Subject<unknown>): Observable<MoleculeDetailItem> {
    const facade = Object.assign(Object.create(MoleculeDetailFacade.prototype), {
      typeGuards: {
        isSystemMolecule: (value: MoleculeDetailItem) => value.type === 'system',
        isChemblMolecule: (value: MoleculeDetailItem) => value.type === 'chembl'
      },
      title: { setSection: jasmine.createSpy('setSection') },
      userContext: { isLoggedIn: () => loggedIn },
      inferenceRetry$: new Subject<void>(), inferenceLoading: signal(false), inferenceError: signal(false),
      ai: { t1Inference: () => inference }
    }) as { withInference: (value: MoleculeDetailItem) => Observable<MoleculeDetailItem> };
    return facade.withInference(item);
  }

  it('keeps decoded properties before and after an inference response', () => {
    const inference = new Subject<unknown>();
    const emissions: MoleculeDetailItem[] = [];
    infer(true, inference).subscribe(value => emissions.push(value));
    inference.next({ prediction: [] });
    expect(emissions.length).toBe(2);
    for (const value of emissions) {
      expect((value as unknown as { properties: unknown }).properties)
        .toEqual({ molecularWeight: 84.162, hBondDonors: 0 });
    }
    expect('properties' in item).toBeFalse();
  });

  it('keeps decoded properties when inference fails', () => {
    const inference = new Subject<unknown>();
    const emissions: MoleculeDetailItem[] = [];
    infer(true, inference).subscribe(value => emissions.push(value));
    inference.error(new Error('Inference unavailable'));
    expect((emissions.at(-1) as unknown as { properties: unknown }).properties)
      .toEqual({ molecularWeight: 84.162, hBondDonors: 0 });
  });

  it('emits decoded properties for anonymous detail viewing', () => {
    let emitted: MoleculeDetailItem | undefined;
    infer(false, new Subject<unknown>()).subscribe(value => emitted = value);
    expect((emitted as unknown as { properties: unknown }).properties)
      .toEqual({ molecularWeight: 84.162, hBondDonors: 0 });
  });
});

describe('MoleculeDetailFacade history identifiers', () => {
  function history(id: string, collectionId = '') {
    const mark = jasmine.createSpy('markItemAsTouched').and.returnValue(of(true));
    const poll = jasmine.createSpy('pollNewItem').and.returnValue(of({}));
    const facade = Object.assign(Object.create(MoleculeDetailFacade.prototype), {
      currentId: signal(id), touchedId: '',
      uuidV7: /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      userContext: { isLoggedIn: () => true },
      route: { snapshot: { queryParamMap: { get: () => collectionId } } },
      itemService: { markItemAsTouched: mark }, history: { pollNewItem: poll },
      destroyRef: { onDestroy: () => () => undefined }
    }) as MoleculeDetailFacade;
    return { facade, mark, poll };
  }

  it('does not send a ChEMBL molregno to the collection-item history mutation', () => {
    const { facade, mark, poll } = history('783518');
    facade.markTouched();
    expect(mark).not.toHaveBeenCalled();
    expect(poll).not.toHaveBeenCalled();
  });

  it('preserves history tracking and collection context for a Mercurion UUID', () => {
    const id = '019b80d4-faa0-7000-af01-35947e9f4d6c';
    const collectionId = '019b80d4-faa1-7000-af01-35947e9f4d6c';
    const { facade, mark, poll } = history(id, collectionId);
    facade.markTouched();
    facade.markTouched();
    expect(mark).toHaveBeenCalledOnceWith(id, JSON.stringify({ c_id: collectionId }));
    expect(poll).toHaveBeenCalledTimes(1);
  });
});


describe('Molecule deletion', () => {
  function setup() {
    const response = new Subject<boolean>();
    const remove = jasmine.createSpy().and.returnValue(response);
    const navigate = jasmine.createSpy().and.resolveTo(true);
    const facade = Object.assign(Object.create(MoleculeDetailFacade.prototype), {
      currentId: signal('molecule-1'), currentType: 'custom', deletePending: signal(false), deleteError: signal(''),
      itemService: { deleteItem: remove }, history: { triggerRemoveItemFromHistoryView: jasmine.createSpy() },
      toast: { trigger: jasmine.createSpy() }, router: { navigateByUrl: navigate },
      destroyRef: { onDestroy: () => () => undefined }
    }) as MoleculeDetailFacade;
    return { facade, response, remove, navigate };
  }
  it('prevents duplicate submission and keeps failed deletion retryable without navigating', () => {
    const { facade, response, remove, navigate } = setup();
    facade.delete('molecule-1'); facade.delete('molecule-1');
    expect(remove).toHaveBeenCalledTimes(1); expect(facade.deletePending()).toBeTrue();
    response.next(false); response.complete();
    expect(facade.deleteError()).toBeTruthy(); expect(facade.deletePending()).toBeFalse();
    expect(navigate).not.toHaveBeenCalled();
  });
  it('exposes transport errors instead of silently closing the confirmation', () => {
    const { facade, response, navigate } = setup(); facade.delete('molecule-1'); response.error(new Error('offline'));
    expect(facade.deleteError()).toBeTruthy(); expect(facade.deletePending()).toBeFalse();
    expect(navigate).not.toHaveBeenCalled();
  });
  it('refuses deletion for a different route resource', () => {
    const { facade, remove } = setup(); facade.delete('other-molecule'); expect(remove).not.toHaveBeenCalled();
  });
});


describe('Molecule metadata persistence', () => {
  function setup() {
    const response = new Subject<unknown>();
    const update = jasmine.createSpy().and.returnValue(response);
    const toast = jasmine.createSpy();
    const facade = Object.assign(Object.create(MoleculeDetailFacade.prototype), {
      currentId: signal('molecule-1'), currentType: 'custom', currentName: signal('Prima'),
      itemService: { updateItemLabel: update, updateItemNotes: update, updateItemName: update },
      history: { pollNewItem: () => new Observable(observer => observer.error(new Error('history offline'))) },
      toast: { trigger: toast }, destroyRef: { onDestroy: () => () => undefined }
    }) as MoleculeDetailFacade;
    return { facade, response, update, toast };
  }
  it('reports null mutation responses as failed rather than showing a success toast', () => {
    const { facade, response, toast } = setup(); let result: boolean | undefined;
    facade.saveDetail({ id: 'molecule-1', type: 'notes', label: 'Note', value: 'Bozza' }).subscribe(value => result = value);
    response.next(null); expect(result).toBeFalse(); expect(toast).not.toHaveBeenCalled();
  });
  it('acknowledges a saved name even when secondary history synchronization fails', () => {
    const { facade, response } = setup(); let result: boolean | undefined;
    facade.saveDetail({ id: 'molecule-1', type: 'name', label: '', value: 'Dopo' }).subscribe(value => result = value);
    response.next({ id: 'molecule-1' }); expect(result).toBeTrue(); expect(facade.currentName()).toBe('Dopo');
  });
  it('refuses stale resource identifiers', () => {
    const { facade, update } = setup(); let result: boolean | undefined;
    facade.saveDetail({ id: 'other', type: 'label', label: '', value: 'Bozza' }).subscribe(value => result = value);
    expect(result).toBeFalse(); expect(update).not.toHaveBeenCalled();
  });
  it('turns mutation transport errors into a retryable result', () => {
    const { facade, response } = setup(); let result: boolean | undefined;
    facade.saveDetail({ id: 'molecule-1', type: 'notes', label: '', value: 'Bozza' }).subscribe(value => result = value);
    response.error(new Error('offline')); expect(result).toBeFalse();
  });
});


describe('Tox21 request lifecycle', () => {
  function setup() {
    const requests: Subject<unknown>[] = [];
    const item = { type: 'custom', id: 'custom-item', name: 'Cyclohexane', canonicalSmiles: 'C1CCCCC1', joins: [] } as unknown as MoleculeDetailItem;
    const ai = jasmine.createSpy().and.callFake(() => { const response = new Subject<unknown>(); requests.push(response); return response; });
    const facade = Object.assign(Object.create(MoleculeDetailFacade.prototype), {
      typeGuards: { isSystemMolecule: () => false, isChemblMolecule: () => false },
      title: { setSection: () => undefined }, userContext: { isLoggedIn: () => true },
      inferenceRetry$: new Subject<void>(), inferenceLoading: signal(false), inferenceError: signal(false),
      ai: { t1Inference: ai }, molecule: () => item
    }) as unknown as { inferenceLoading: MoleculeDetailFacade['inferenceLoading']; inferenceError: MoleculeDetailFacade['inferenceError']; retryInference: MoleculeDetailFacade['retryInference']; withInference: (value: MoleculeDetailItem) => Observable<MoleculeDetailItem> };
    const emissions: MoleculeDetailItem[] = [];
    const subscription = facade.withInference(item).subscribe(value => emissions.push(value));
    return { facade, requests, ai, emissions, subscription };
  }
  it('keeps the detail available on failure and retries only inference without duplicate requests', () => {
    const { facade, requests, ai, emissions, subscription } = setup();
    expect(emissions.length).toBe(1); expect(facade.inferenceLoading()).toBeTrue();
    facade.retryInference(); expect(ai).toHaveBeenCalledTimes(1);
    requests[0].error(new Error('offline'));
    expect(facade.inferenceLoading()).toBeFalse(); expect(facade.inferenceError()).toBeTrue();
    facade.retryInference(); expect(ai).toHaveBeenCalledTimes(2); expect(facade.inferenceError()).toBeFalse();
    requests[1].next({ 'SR-p53': { probability: .2, threshold: .35, is_positive: false } }); requests[1].complete();
    expect(facade.inferenceLoading()).toBeFalse(); expect(emissions.at(-1)?.t1Inference).toBeTruthy();
    subscription.unsubscribe();
  });
  it('cancels an outstanding inference when its detail stream is replaced', () => {
    const { facade, requests, emissions, subscription } = setup();
    subscription.unsubscribe(); requests[0].next({ 'SR-p53': {} });
    expect(emissions.length).toBe(1); expect(facade.inferenceLoading()).toBeFalse();
  });
});
