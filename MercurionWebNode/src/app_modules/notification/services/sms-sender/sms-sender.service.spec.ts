import { Test, TestingModule } from '@nestjs/testing';
import { SmsSenderService } from './sms-sender.service';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

describe('SmsSenderService', () => {
  let service: SmsSenderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsSenderService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
        { provide: Twilio, useValue: { messages: { create: jest.fn() } } },
      ],
    }).compile();

    service = module.get<SmsSenderService>(SmsSenderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
