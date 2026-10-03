import { Test, TestingModule } from '@nestjs/testing';
import { PcpController } from './pcp.controller';
import { PcpService } from '../services/pcp.service';
import { IS_PUBLIC_KEY } from 'src/metadata/metadata';
import { createGlobalValidationPipe } from 'src/config/validation-pipe';
import { PcpGetIupacNameFromSmilesDTO } from '../models/dto/pcp-get-iupac-name-from-smiles.dto';

describe('PcpController', () => {
  let controller: PcpController;
  const getIupacNameFromSmiles = jest.fn();

  beforeEach(async () => {
    getIupacNameFromSmiles.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PcpController],
      providers: [{ provide: PcpService, useValue: { getIupacNameFromSmiles } }],
    }).compile();

    controller = module.get<PcpController>(PcpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('exposes the name lookup publicly and returns its text result', async () => {
    getIupacNameFromSmiles.mockResolvedValue('ethanol');
    const handler = Object.getOwnPropertyDescriptor(PcpController.prototype, 'getIupacName')?.value;

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
    await expect(controller.getIupacName({ smiles: 'CCO' })).resolves.toBe('ethanol');
    expect(getIupacNameFromSmiles).toHaveBeenCalledWith({ smiles: 'CCO' });
  });

  it('normalizes a request without requiring an access token', async () => {
    const dto = await createGlobalValidationPipe().transform(
      { smiles: ' CCO ' }, { type: 'body', metatype: PcpGetIupacNameFromSmilesDTO }
    );

    expect(dto.smiles).toBe('CCO');
  });

  it.each([{ smiles: '   ' }, { smiles: 'CCO', unknown: true }, { smiles: 'C'.repeat(1025) }])(
    'rejects invalid request %j', async body => {
      await expect(createGlobalValidationPipe().transform(
        body, { type: 'body', metatype: PcpGetIupacNameFromSmilesDTO }
      )).rejects.toThrow();
    }
  );
});
