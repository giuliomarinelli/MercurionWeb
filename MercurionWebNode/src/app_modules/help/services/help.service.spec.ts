import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HelpService } from './help.service';
import { Ticket } from '../models/entities/ticket.entity';
import { TicketMessage } from '../models/entities/ticket-message.entity';
import { UserService } from 'src/app_modules/user/services/user.service';
import { NotificationOutboxService } from 'src/app_modules/notification/services/outbox/notification-outbox.service';

describe('HelpService', () => {
  let service: HelpService;

  const dataSourceMock = { transaction: jest.fn() };
  const ticketRepoMock = { findOneByOrFail: jest.fn(), update: jest.fn() };
  const msgRepoMock = {};
  const userServiceMock = { getUserFullNames: jest.fn() };
  const outboxMock = { append: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelpService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: getRepositoryToken(Ticket), useValue: ticketRepoMock },
        { provide: getRepositoryToken(TicketMessage), useValue: msgRepoMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: NotificationOutboxService, useValue: outboxMock },
      ],
    }).compile();

    service = module.get<HelpService>(HelpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
