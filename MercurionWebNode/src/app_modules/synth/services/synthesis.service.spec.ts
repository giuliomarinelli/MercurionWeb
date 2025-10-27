import { Test, TestingModule } from '@nestjs/testing';
import { SynthesisService } from './synthesis.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Synthesis } from '../Models/entities/synthesis.entity';

describe('SyntheticRouteService', () => {
  let service: SynthesisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SynthesisService,
        {
          provide: getRepositoryToken(Synthesis),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SynthesisService>(SynthesisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
