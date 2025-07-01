import { Test, TestingModule } from '@nestjs/testing';
import { SyntheticStepService } from './synthetic-step.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SyntheticStepEntity } from '../../Models/entities/synth/synthetic-step.entity';

describe('SyntheticStepService', () => {
  let service: SyntheticStepService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyntheticStepService,
        {
          provide: getRepositoryToken(SyntheticStepEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SyntheticStepService>(SyntheticStepService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
