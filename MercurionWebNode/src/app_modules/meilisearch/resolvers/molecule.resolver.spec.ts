import { MoleculeResolver } from './molecule.resolver';
import { MoleculeService } from '../services/molecule.service';

describe('MoleculeResolver', () => {
  it('should return molecule detail using MoleculeService', async () => {
    const getDetailByMolregnoMock = jest.fn();
    const service = { getDetailByMolregno: getDetailByMolregnoMock } as unknown as MoleculeService;
    const resolver = new MoleculeResolver(service);
    await resolver.moleculeByMolregno('42');
    expect(getDetailByMolregnoMock).toHaveBeenCalledWith('42');
  });
});
