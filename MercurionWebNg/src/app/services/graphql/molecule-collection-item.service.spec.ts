import { TestBed } from '@angular/core/testing';
import { print } from 'graphql';

import type {
  MoleculeItemBasicDataQuery
} from '../../generated/graphql';
import {
  CreateMoleculeItemDocument,
  MoleculeItemBasicDataDocument,
  MyMoleculeItemsDocument,
  UpdateMoleculeItemDocument
} from '../../generated/graphql';
import type {
  MoleculeItemDTO
} from '../../Models/graphql/molecule-collection/molecule-collection.types';
import {
  mapMoleculeItemBasicData,
  mapMoleculeItemDtoToClient,
  MoleculeCollectionItemService
} from './molecule-collection-item.service';

describe('MoleculeCollectionItemService', () => {
  let service: MoleculeCollectionItemService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoleculeCollectionItemService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('maps a generated custom DTO variant without a cast', () => {
    const dto = {
      __typename: 'CustomMoleculeItemDTO',
      id: 'custom-1',
      label: 'Custom lead',
      notes: null,
      type: 'custom',
      createdAt: '1',
      updatedAt: '2',
      touchedAt: '3',
      joins: [{
        id: 'join-1',
        collection: {
          id: 'collection-1',
          name: 'Collection',
          createdAt: '1',
          updatedAt: '2',
          touchedAt: '3',
          itemsCount: 1
        }
      }],
      canonicalSmiles: 'CCO',
      molFormula: 'C2H6O',
      name: 'Ethanol',
      propertiesJson: null
    } satisfies MoleculeItemDTO;

    const result = mapMoleculeItemDtoToClient(dto);

    expect(result.type).toBe('custom');
    if (result.type !== 'custom') {
      throw new Error('Expected custom molecule');
    }
    expect(result.canonicalSmiles).toBe('CCO');
    expect(result.joins[0]?.collection).toEqual({
      id: 'collection-1',
      name: 'Collection',
      createdAt: '1',
      updatedAt: '2',
      touchedAt: '3',
      itemsCount: 1
    });
  });

  it('maps a generated ChEMBL DTO variant without a cast', () => {
    const dto = {
      __typename: 'ChEMBLMoleculeItemDTO',
      id: 'chembl-1',
      label: 'ChEMBL lead',
      notes: null,
      type: 'chembl',
      createdAt: '4',
      updatedAt: '5',
      touchedAt: '6',
      joins: null,
      chemblMolregno: '42',
      chemblDetails: null
    } satisfies MoleculeItemDTO;

    const result = mapMoleculeItemDtoToClient(dto);

    expect(result.type).toBe('chembl');
    if (result.type !== 'chembl') {
      throw new Error('Expected ChEMBL molecule');
    }
    expect(result.chemblMolregno).toBe(42);
    expect(result.joins).toEqual([]);
  });

  it('narrows both generated basic-data variants by __typename', () => {
    const items = [
      {
        __typename: 'CustomMoleculeItemDTO',
        id: 'custom-1',
        type: 'custom',
        name: 'Ethanol',
        canonicalSmiles: 'CCO'
      },
      {
        __typename: 'ChEMBLMoleculeItemDTO',
        id: 'chembl-1',
        type: 'chembl',
        chemblDetails: {
          preferredName: null,
          preferredNameIt: 'Molecola',
          canonicalSmiles: 'CCC'
        }
      }
    ] satisfies MoleculeItemBasicDataQuery['myMoleculeItems'];

    expect(items.map(mapMoleculeItemBasicData)).toEqual([
      {
        id: 'custom-1',
        name: 'Ethanol',
        canonicalSmiles: 'CCO',
        type: 'custom'
      },
      {
        id: 'chembl-1',
        name: 'Molecola',
        canonicalSmiles: 'CCC',
        type: 'chembl'
      }
    ]);
  });

  it('keeps all four audited operations explicitly discriminated', () => {
    for (const document of [
      MyMoleculeItemsDocument,
      MoleculeItemBasicDataDocument,
      CreateMoleculeItemDocument,
      UpdateMoleculeItemDocument
    ]) {
      const source = print(document);
      expect(source).toContain('__typename');
      expect(source).toContain('... on CustomMoleculeItemDTO');
      expect(source).toContain('... on ChEMBLMoleculeItemDTO');
    }
  });
});
