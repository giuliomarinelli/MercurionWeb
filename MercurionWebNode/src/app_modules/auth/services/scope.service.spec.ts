import { ScopeService } from './scope.service';
import { SercurityService } from './sercurity.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { JwtToolsService } from './jwt-tools.service';

describe('ScopeService', () => {
  it('should be defined', () => {
    const service = new ScopeService(
      {} as unknown as SercurityService,
      {
        findOneOrFail: jest.fn(),
      } as any,
      {
        verifyTokenAndGetPayload: jest.fn(),
      } as unknown as JwtToolsService,
      {
        forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
      } as unknown as MeiliLoggerService,
    );
    expect(service).toBeDefined();
  });
});
