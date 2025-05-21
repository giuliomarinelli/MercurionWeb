import { MoleculePreviewDBView } from './molecule-preview-db-view.entity';

describe('MoleculePreviewDBView', () => {
  it('should create an instance of the preview view', () => {
    const entity = new MoleculePreviewDBView();
    expect(entity).toBeInstanceOf(MoleculePreviewDBView);
  });
});
