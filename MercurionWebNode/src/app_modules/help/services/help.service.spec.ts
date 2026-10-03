import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HelpService } from './help.service';
import { Ticket } from '../models/entities/ticket.entity';
import { TicketMessage } from '../models/entities/ticket-message.entity';
import { UserService } from 'src/app_modules/user/services/user.service';
import { NotificationOutboxService } from 'src/app_modules/notification/services/outbox/notification-outbox.service';
import { InAppNotificationService } from 'src/app_modules/notification/services/in-app-notification.service';
import { ScopeService } from 'src/app_modules/auth/services/scope.service';
import { Scope } from 'src/app_modules/user/models/enums/scope.enum';

describe('HelpService', () => {
  let service: HelpService;

  const dataSourceMock = { transaction: jest.fn() };
  const ticketRepoMock = { findOneByOrFail: jest.fn(), update: jest.fn() };
  const msgRepoMock = {};
  const userServiceMock = {
    getUserFullNames: jest.fn(),
    getVerifiedUserIds: jest.fn().mockResolvedValue([])
  };
  const scopeServiceMock = { verifyUserHasScopes: jest.fn() };
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
        { provide: ScopeService, useValue: scopeServiceMock },
        { provide: NotificationOutboxService, useValue: outboxMock },
        { provide: InAppNotificationService, useValue: inAppNotificationMock },
      ],
    }).compile();

    service = module.get<HelpService>(HelpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('selects only support recipients with ViewUsers and HandleTickets', async () => {
    const authorId = '018f0f12-3d4c-7abc-8def-0123456789a1';
    const eligibleId = '018f0f12-3d4c-7abc-8def-0123456789a2';
    const ineligibleId = '018f0f12-3d4c-7abc-8def-0123456789a3';

    userServiceMock.getVerifiedUserIds.mockResolvedValue([
      authorId,
      eligibleId,
      ineligibleId
    ]);
    scopeServiceMock.verifyUserHasScopes.mockImplementation(
      async (userId: string) => userId === eligibleId
    );

    const recipients = await (service as any)
      .resolveSupportNotificationRecipients(authorId);

    expect(recipients).toEqual([eligibleId]);
    expect(scopeServiceMock.verifyUserHasScopes).not.toHaveBeenCalledWith(
      authorId,
      Scope.ViewUsers,
      Scope.HandleTickets
    );
    expect(scopeServiceMock.verifyUserHasScopes).toHaveBeenCalledWith(
      eligibleId,
      Scope.ViewUsers,
      Scope.HandleTickets
    );
    expect(scopeServiceMock.verifyUserHasScopes).toHaveBeenCalledWith(
      ineligibleId,
      Scope.ViewUsers,
      Scope.HandleTickets
    );
  });
});
