import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeSearchService } from './molecule-search.service';
import { ChEMBLMoleculeItemService } from '../../molecule-collection/services/chembl-molecule-item.service';

describe('MoleculeSearchService', () => {
  let service: MoleculeSearchService;
  const mockIndex = { search: jest.fn() };
  const meiliClient = { index: jest.fn().mockReturnValue(mockIndex) };
  const chemblItems = { getChemblMolregnosByCollectionId: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeSearchService,
        { provide: 'MEILISEARCH_CLIENT', useValue: meiliClient },
        { provide: ChEMBLMoleculeItemService, useValue: chemblItems },
      ],
    }).compile();

    service = module.get<MoleculeSearchService>(MoleculeSearchService);
    jest.clearAllMocks();
  });

  it('builds filters and normalizes search results', async () => {
    mockIndex.search.mockResolvedValue({
      hits: [
        {
          id: 1,
          preferredName: 'Lorazepam',
          synonyms: 'Ativan;  Loraz',
          mwFreebase: 321.2,
          alogp: 2.1,
          maxPhase: 4,
        },
      ],
    });

    const input = {
      query: 'loraz',
      limit: 5,
      maxPhase: 3,
      moleculeType: 'drug',
      minMw: 10,
      maxMw: 500,
    };

    const results = await service.searchMolecules(input);

    expect(meiliClient.index).toHaveBeenCalledWith('molecule_previews_chembl_36');
    expect(mockIndex.search).toHaveBeenCalledWith('loraz', {
      limit: 5,
      filter: ['maxPhase = 3', 'moleculeType = "drug"', 'mwFreebase >= 10', 'mwFreebase <= 500'],
    });
    expect(results).toEqual([
      {
        id: 1,
        preferredName: 'Lorazepam',
        synonyms: ['Ativan', 'Loraz'],
        mwFreebase: 321.2,
        alogp: 2.1,
        maxPhase: 4,
        known: true,
      },
    ]);
  });

  it('skips search when query is missing for exclusion flow', async () => {
    const data = await service.searchMolecules_excludeAlreadyAdded({}, 'collection' as any, 'user' as any);
    expect(data).toEqual([]);
    expect(mockIndex.search).not.toHaveBeenCalled();
  });

  it('filters out items already added to the collection', async () => {
    const hits = [
      { id: 1, preferredName: 'Lorazepam', synonyms: 'syn', known: true },
      { id: 2, preferredName: 'Diazepam', synonyms: '', known: true },
    ];
    jest.spyOn(service, 'searchMolecules').mockResolvedValue(hits as any);
    chemblItems.getChemblMolregnosByCollectionId.mockResolvedValue([1]);

    const filtered = await service.searchMolecules_excludeAlreadyAdded({ query: 'loraz' }, 'collection' as any, 'user' as any);

    expect(service.searchMolecules).toHaveBeenCalledWith({ query: 'loraz' });
    expect(chemblItems.getChemblMolregnosByCollectionId).toHaveBeenCalledWith('user', 'collection');
    expect(filtered).toEqual([{ id: 2, preferredName: 'Diazepam', synonyms: '', known: true }]);
  });
});
