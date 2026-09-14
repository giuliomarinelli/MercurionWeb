import { Test, TestingModule } from '@nestjs/testing';
import { SmsSenderService } from './sms-sender.service';
import { ConfigService } from '@nestjs/config';

describe('SmsSenderService', () => {
  let service: SmsSenderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsSenderService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              accountSID: 'AC00000000000000000000000000000000',
              authToken: '00000000000000000000000000000000',
              from: '+10000000000',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SmsSenderService>(SmsSenderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
