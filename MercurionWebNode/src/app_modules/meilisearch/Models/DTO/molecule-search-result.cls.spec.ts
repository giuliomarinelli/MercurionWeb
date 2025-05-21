import { MoleculeSearchResult } from './molecule-search-result.cls';

describe('MoleculeSearchResult', () => {
  it('should hold search result fields', () => {
    const result = new MoleculeSearchResult();
    result.id = 1;
    result.preferredName = 'Aspirin';
    expect(result.id).toBe(1);
    expect(result.preferredName).toBe('Aspirin');
  });
});
