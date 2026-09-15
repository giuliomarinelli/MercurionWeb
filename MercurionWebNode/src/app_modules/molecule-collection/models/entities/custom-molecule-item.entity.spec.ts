import { CustomMoleculeItemEntity } from './custom-molecule-item.entity';

describe('CustomMoleculeItemEntity', () => {
  it('should instantiate the custom molecule item', () => {
    const entity = new CustomMoleculeItemEntity();
    expect(entity).toBeInstanceOf(CustomMoleculeItemEntity);
  });
});
