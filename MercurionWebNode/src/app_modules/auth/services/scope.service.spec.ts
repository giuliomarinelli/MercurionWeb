import { ScopeService } from './scope.service';
import { SecurityService } from './security.service';
import { LoggerPort } from 'src/logging/logger.port';

describe('ScopeService', () => {
  it('should be defined', () => {
    const service = new ScopeService(
      {} as unknown as SecurityService,
      {
        getUserScopesById: jest.fn().mockResolvedValue([]),
      },
      {
        forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
      } as unknown as LoggerPort,
    );
    expect(service).toBeDefined();
  });
});
