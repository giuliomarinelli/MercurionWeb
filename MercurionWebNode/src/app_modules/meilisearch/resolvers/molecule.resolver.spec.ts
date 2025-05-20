import { MoleculeResolver } from './molecule.resolver';

describe('MoleculeResolver', () => {
  it('should return molecule detail using MoleculeService', async () => {
    const service = { getDetailByMolregno: jest.fn() } as any;
    const resolver = new MoleculeResolver(service);
    await resolver.moleculeByMolregno('42');
    expect(service.getDetailByMolregno).toHaveBeenCalledWith('42');
  });
});
