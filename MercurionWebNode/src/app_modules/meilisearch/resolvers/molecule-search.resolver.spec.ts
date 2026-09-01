import { MoleculeSearchResolver } from './molecule-search.resolver';

describe('MoleculeSearchResolver', () => {
  const service = {
    searchMolecules: jest.fn(),
    searchMolecules_excludeAlreadyAdded: jest.fn(),
  };
  const resolver = new MoleculeSearchResolver(service as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates moleculeSearch to the service', async () => {
    const data = [{ id: 1 }];
    service.searchMolecules.mockResolvedValue(data);

    const result = await resolver.moleculeSearch({ query: 'loraz' } as any);

    expect(service.searchMolecules).toHaveBeenCalledWith({ query: 'loraz' });
    expect(result).toBe(data);
  });

  it('delegates excludeAlreadyAdded path with collection and user context', async () => {
    const filtered = [{ id: 2 }];
    service.searchMolecules_excludeAlreadyAdded.mockResolvedValue(filtered);

    const result = await resolver.moleculeSearch_excludeAlreadyAdded(
      { query: 'loraz' } as any,
      '018ea030-8d12-7d9a-95c7-f6d1fbc28a4b' as any,
      '018ea030-8d12-7d9a-95c7-f6d1fbc28a4c' as any
    );

    expect(service.searchMolecules_excludeAlreadyAdded).toHaveBeenCalledWith(
      { query: 'loraz' },
      '018ea030-8d12-7d9a-95c7-f6d1fbc28a4b',
      '018ea030-8d12-7d9a-95c7-f6d1fbc28a4c'
    );
    expect(result).toBe(filtered);
  });
});
