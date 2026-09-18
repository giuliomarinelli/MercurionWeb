import { Test, TestingModule } from '@nestjs/testing';
import { MailSenderService } from './mail-sender.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/app_modules/user/services/user.service';
import { LoggerPort } from 'src/logging/logger.port';

describe('MailSenderService', () => {
  let service: MailSenderService;
  let sendMail: jest.Mock;

  beforeEach(async () => {
    sendMail = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailSenderService,
        { provide: MailerService, useValue: { sendMail } },
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

  it('validates registry context before invoking the mail adapter', async () => {
    await expect(service.send('email-verification', 'ada@example.test', {
      firstName: 'Ada',
      totp: '123456',
    } as any)).rejects.toThrow('Invalid context for email template')
    expect(sendMail).not.toHaveBeenCalled()
  });

  it('derives subject and template from the semantic key', async () => {
    await service.send('password-changed', 'ada@example.test', { firstName: 'Ada' })
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'Mercurion: password modificata',
      template: expect.stringContaining('password-changed-notification.hbs'),
    }))
  });
});
