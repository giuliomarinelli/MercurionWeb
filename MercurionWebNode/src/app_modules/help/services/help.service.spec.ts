import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HelpService } from './help.service';
import { Ticket } from '../models/entities/ticket.entity';
import { TicketMessage } from '../models/entities/ticket-message.entity';
import { UserService } from 'src/app_modules/user/services/user.service';
import { NotificationOutboxService } from 'src/app_modules/notification/services/outbox/notification-outbox.service';
import { InAppNotificationService } from 'src/app_modules/notification/services/in-app-notification.service';

describe('HelpService', () => {
  let service: HelpService;

  const dataSourceMock = { transaction: jest.fn() };
  const ticketRepoMock = { findOneByOrFail: jest.fn(), update: jest.fn() };
  const msgRepoMock = {};
  const userServiceMock = { getUserFullNames: jest.fn() };
  const outboxMock = { append: jest.fn() };
  const inAppNotificationMock = { create: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HelpService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: getRepositoryToken(Ticket), useValue: ticketRepoMock },
        { provide: getRepositoryToken(TicketMessage), useValue: msgRepoMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: NotificationOutboxService, useValue: outboxMock },
        { provide: InAppNotificationService, useValue: inAppNotificationMock },
      ],
    }).compile();

    service = module.get<HelpService>(HelpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
