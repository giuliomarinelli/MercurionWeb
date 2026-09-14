import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HelpService } from './help.service';
import { Ticket } from '../Models/entities/ticket.entity';
import { TicketMessage } from '../Models/entities/ticket-message.entity';
import { UserService } from 'src/app_modules/user/services/user.service';
import { MailSenderService } from 'src/app_modules/notification/services/mail-sender/mail-sender.service';

describe('HelpService', () => {
  let service: HelpService;

  const dataSourceMock = { transaction: jest.fn() };
  const ticketRepoMock = { findOneByOrFail: jest.fn(), update: jest.fn() };
  const msgRepoMock = {};
  const userServiceMock = { getUserFullNames: jest.fn() };
  const mailerMock = {
    notifySupportNewTicket: jest.fn(),
    confirmUserTicketOpened: jest.fn(),
    notifySupportNewMessage: jest.fn(),
    notifyUserSupportReplied: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelpService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: getRepositoryToken(Ticket), useValue: ticketRepoMock },
        { provide: getRepositoryToken(TicketMessage), useValue: msgRepoMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: MailSenderService, useValue: mailerMock },
      ],
    }).compile();

    service = module.get<HelpService>(HelpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
