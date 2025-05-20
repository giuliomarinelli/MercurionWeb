import { MoleculeSearchInput } from './molecule-search-input.cls';

describe('MoleculeSearchInput', () => {
  it('should hold query parameters for search', () => {
    const input = new MoleculeSearchInput();
    input.query = 'aspirin';
    input.limit = 5;
    expect(input.query).toBe('aspirin');
    expect(input.limit).toBe(5);
  });
});
