import { Test, TestingModule } from '@nestjs/testing';
import { SyntheticRouteService } from './synthetic-route.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SyntheticRouteEntity } from '../Models/entities/synthetic-route.entity';

describe('SyntheticRouteService', () => {
  let service: SyntheticRouteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyntheticRouteService,
        {
          provide: getRepositoryToken(SyntheticRouteEntity),
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

    service = module.get<SyntheticRouteService>(SyntheticRouteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
