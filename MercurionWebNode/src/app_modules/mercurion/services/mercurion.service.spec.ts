import { Test, TestingModule } from '@nestjs/testing';
import { MercurionAIService } from './mercurion.service';
import { ClientProxy } from '@nestjs/microservices';

describe('MercurionService', () => {
  let service: MercurionAIService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercurionAIService,
        { provide: 'MERCURION_AI_CLIENT', useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = module.get<MercurionAIService>(MercurionAIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
