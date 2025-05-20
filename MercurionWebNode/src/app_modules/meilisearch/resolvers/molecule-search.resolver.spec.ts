import { MoleculeSearchResolver } from './molecule-search.resolver';

describe('MoleculeSearchResolver', () => {
  it('should delegate search to MoleculeSearchService', async () => {
    const service = { searchMolecules: jest.fn() } as any;
    const resolver = new MoleculeSearchResolver(service);
    const input = {} as any;
    await resolver.moleculeSearch(input);
    expect(service.searchMolecules).toHaveBeenCalledWith(input);
  });
});
