import { AdminController } from './admin.controller';
import { LoggerPort } from 'src/logging/logger.port';
import { ResponseService } from 'src/services/response.service';

describe('AdminController', () => {
  it('should be defined', () => {
    const loggerFactory = {
      forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
      setLogLevels: jest.fn(),
    } as unknown as LoggerPort;
    const controller = new AdminController(
      loggerFactory,
      {} as unknown as ResponseService,
    );
    expect(controller).toBeDefined();
  });
});
