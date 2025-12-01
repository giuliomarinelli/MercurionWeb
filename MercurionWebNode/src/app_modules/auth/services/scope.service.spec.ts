import { ScopeService } from './scope.service';
import { SercurityService } from './sercurity.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('ScopeService', () => {
  it('should be defined', () => {
    const service = new ScopeService(
      {} as unknown as SercurityService,
      {
        findOneOrFail: jest.fn(),
      } as any,
      {
        forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
      } as unknown as MeiliLoggerService,
    );
    expect(service).toBeDefined();
  });
});
