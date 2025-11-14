import { Test, TestingModule } from '@nestjs/testing';
import { HistoryController } from './history.controller';
import { HistoryService } from '../services/history.service';

describe('HistoryController', () => {
  let controller: HistoryController;
  const historyServiceMock = { getPaginatedHistory: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoryController],
      providers: [{ provide: HistoryService, useValue: historyServiceMock }],
    }).compile();

    controller = module.get<HistoryController>(HistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
