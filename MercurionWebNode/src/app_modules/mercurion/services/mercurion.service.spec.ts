import { Test, TestingModule } from '@nestjs/testing';
import { MercurionService } from './mercurion.service';
import { ClientProxy } from '@nestjs/microservices';

describe('MercurionService', () => {
  let service: MercurionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercurionService,
        { provide: 'MERCURION_CLIENT', useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = module.get<MercurionService>(MercurionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
