import { MoleculeCollection } from './molecule-collection.entity';

describe('MoleculeCollection', () => {
  it('should instantiate a molecule collection', () => {
    const collection = new MoleculeCollection();
    expect(collection).toBeInstanceOf(MoleculeCollection);
  });
});
