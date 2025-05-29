import { Test, TestingModule } from '@nestjs/testing';
import { SercurityService } from './sercurity.service';
import { ConfigService } from '@nestjs/config';

describe('SercurityService', () => {
  let service: SercurityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SercurityService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
      ],
    }).compile();

    service = module.get<SercurityService>(SercurityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
