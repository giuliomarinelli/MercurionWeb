import { MoleculeCollectionItemJoin } from './molecule-collection-item-join.entity';
import { getMetadataArgsStorage } from 'typeorm';

describe('MoleculeCollectionItemJoin', () => {
  it('should create join entity instance', () => {
    const join = new MoleculeCollectionItemJoin();
    expect(join).toBeInstanceOf(MoleculeCollectionItemJoin);
  });
});


describe('MoleculeCollectionItemJoin DB-first mapping', () => {
  it('uses single-column foreign keys instead of composite ownership foreign keys', () => {
    const columns = getMetadataArgsStorage().joinColumns
      .filter(column => column.target === MoleculeCollectionItemJoin)
      .map(column => column.name)
      .sort();

    expect(columns).toEqual(['collection_id', 'item_id']);
    expect(columns).not.toContain('user_id');
  });
});
