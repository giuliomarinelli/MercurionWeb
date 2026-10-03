import { Test, TestingModule } from '@nestjs/testing';
import { PcpController } from './pcp.controller';

describe('PcpController', () => {
  let controller: PcpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PcpController],
    }).compile();

    controller = module.get<PcpController>(PcpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
