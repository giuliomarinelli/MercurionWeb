import { Test, TestingModule } from '@nestjs/testing';
import { RdKitController } from './rd-kit.controller';
import { RDKitService } from '../services/rd-kit.service';
import { IS_PUBLIC_KEY } from 'src/metadata/metadata';

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

  it.each(['getMoleculeProperties', 'toCanonicalSmiles', 'areSameStructure'] as const)(
    'exposes %s publicly', (method) => {
      const handler = Object.getOwnPropertyDescriptor(RdKitController.prototype, method)?.value;
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
    }
  );
});
