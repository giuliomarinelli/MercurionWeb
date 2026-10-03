import { Test, TestingModule } from '@nestjs/testing';
import { HistoryController } from './history.controller';
import { HistoryService } from '../services/history.service';
import { LoggerPort } from 'src/logging/logger.port';
import { RealtimeStateSyncService } from 'src/app_modules/socket-io/realtime-state-sync.service';

describe('HistoryController', () => {
  let controller: HistoryController;
  const historyServiceMock = { getPaginatedHistory: jest.fn(), deleteHistory: jest.fn() };
  const stateSyncMock = { publishToUser: jest.fn() };
  const loggerFactoryMock = { forContext: jest.fn(() => ({ warn: jest.fn() })) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoryController],
      providers: [
        { provide: HistoryService, useValue: historyServiceMock },
        { provide: RealtimeStateSyncService, useValue: stateSyncMock },
        { provide: LoggerPort, useValue: loggerFactoryMock },
      ],
    }).compile();

    controller = module.get<HistoryController>(HistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
