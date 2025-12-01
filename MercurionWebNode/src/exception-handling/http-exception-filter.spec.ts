import { HttpExceptionFilter } from './http-exception-filter';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('HttpExceptionFilter', () => {
  it('should create an instance', () => {
    const filter = new HttpExceptionFilter({
      forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
    } as unknown as MeiliLoggerService);
    expect(filter).toBeInstanceOf(HttpExceptionFilter);
  });
});
