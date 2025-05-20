import { MoleculeDetailDBView } from './molecule-detail-db-view.entity';

describe('MoleculeDetailDBView', () => {
  it('should create an instance of the detail view', () => {
    const entity = new MoleculeDetailDBView();
    expect(entity).toBeInstanceOf(MoleculeDetailDBView);
  });
});
