import {
  mapMoleculeDetail,
  MoleculeDetailViewModel
} from './molecule-detail.facade';
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
