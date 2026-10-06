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
