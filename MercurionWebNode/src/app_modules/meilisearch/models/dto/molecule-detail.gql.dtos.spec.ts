import { MoleculeProperties } from './molecule-detail.gql.dtos';

describe('MoleculeProperties', () => {
  it('should hold molecule numeric properties', () => {
    const props = new MoleculeProperties();
    props.mwFreebase = 300;
    expect(props.mwFreebase).toBe(300);
  });
});
