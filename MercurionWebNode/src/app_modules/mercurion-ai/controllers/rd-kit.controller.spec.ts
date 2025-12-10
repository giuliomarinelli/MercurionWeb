import { Test, TestingModule } from '@nestjs/testing';
import { RdKitController } from './rd-kit.controller';
import { RDKitService } from '../services/rd-kit.service';

describe('RdKitController', () => {
  let controller: RdKitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RdKitController],
      providers: [
        {
          provide: RDKitService,
          useValue: {
            getMoleculeProperties: jest.fn(),
            toCanonicalSmiles: jest.fn(),
            areSameStructure: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RdKitController>(RdKitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
