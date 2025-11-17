import { Test, TestingModule } from '@nestjs/testing';
import { HistoryController } from './history.controller';
import { HistoryService } from '../services/history.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('HistoryController', () => {
  let controller: HistoryController;
  const historyServiceMock = { getPaginatedHistory: jest.fn() };
  const loggerFactoryMock = { forContext: jest.fn(() => ({ warn: jest.fn() })) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoryController],
      providers: [
        { provide: HistoryService, useValue: historyServiceMock },
        { provide: MeiliLoggerService, useValue: loggerFactoryMock },
      ],
    }).compile();

    controller = module.get<HistoryController>(HistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
