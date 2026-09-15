import { SmilesDTO } from './smiles.cls.dto';

describe('SmilesDTO', () => {
  it('should store a SMILES string', () => {
    const dto = new SmilesDTO();
    dto.smiles = 'C(C(=O)O)N';
    expect(dto.smiles).toBe('C(C(=O)O)N');
  });
});
