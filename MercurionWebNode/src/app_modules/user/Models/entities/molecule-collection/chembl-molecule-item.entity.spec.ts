import { ChEMBLMoleculeItemEntity } from './chembl-molecule-item.entity';

describe('ChEMBLMoleculeItemEntity', () => {
  it('should instantiate the chembl molecule item', () => {
    const entity = new ChEMBLMoleculeItemEntity();
    expect(entity).toBeInstanceOf(ChEMBLMoleculeItemEntity);
  });
});
