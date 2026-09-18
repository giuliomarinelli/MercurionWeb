import { MoleculeCollectionItemJoin } from './molecule-collection-item-join.entity';

describe('MoleculeCollectionItemJoin', () => {
  it('should create join entity instance', () => {
    const join = new MoleculeCollectionItemJoin();
    expect(join).toBeInstanceOf(MoleculeCollectionItemJoin);
  });
});
