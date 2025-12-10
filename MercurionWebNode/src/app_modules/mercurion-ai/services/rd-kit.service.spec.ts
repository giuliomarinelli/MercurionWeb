import { Test, TestingModule } from '@nestjs/testing';
import { RDKitService } from './rd-kit.service';
import { ConfigService } from '@nestjs/config';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { ClientProxy } from '@nestjs/microservices';

describe('RdKitService', () => {
  let service: RDKitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RDKitService,
        {
          provide: 'MERCURION_AI_CLIENT',
          useValue: { send: jest.fn() } as Partial<ClientProxy>,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'App.maxNatsPayloadBytes') return 1024 * 1024;
              if (key === 'App.env') return 'development';
              if (key === 'App.natsHost') return 'localhost';
              if (key === 'App.natsPort') return 4222;
              return undefined;
            }),
          },
        },
        {
          provide: MeiliLoggerService,
          useValue: {
            forContext: jest.fn(() => ({
              log: jest.fn(),
              error: jest.fn(),
              warn: jest.fn(),
              debug: jest.fn(),
              verbose: jest.fn(),
              fatal: jest.fn(),
              setLogLevels: jest.fn(),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<RDKitService>(RDKitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
