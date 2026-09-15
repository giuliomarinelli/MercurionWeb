import { Test, TestingModule } from '@nestjs/testing';
import { MailSenderService } from './mail-sender.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/app_modules/user/services/user.service';
import { LoggerPort } from 'src/logging/logger.port';

describe('MailSenderService', () => {
  let service: MailSenderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailSenderService,
        { provide: MailerService, useValue: { sendMail: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('support@example.com') } },
        {
          provide: UserService,
          useValue: {
            getUserFirstNameById: jest.fn(),
            getUserProvidedEmailById: jest.fn(),
          },
        },
        {
          provide: LoggerPort,
          useValue: {
            forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
          },
        },
      ],
    }).compile();

    service = module.get<MailSenderService>(MailSenderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
