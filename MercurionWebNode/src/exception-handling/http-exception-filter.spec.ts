import { HttpExceptionFilter } from './http-exception-filter';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { ArgumentsHost } from '@nestjs/common';
import {
  ApplicationErrorCode,
  applicationError
} from './application-error';

describe('HttpExceptionFilter', () => {
  it('should create an instance', () => {
    const filter = new HttpExceptionFilter({
      forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
    } as unknown as MeiliLoggerService);
    expect(filter).toBeInstanceOf(HttpExceptionFilter);
  });

  it('maps canonical codes to the preserved REST status and public message', () => {
    const filter = new HttpExceptionFilter({
      forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
    } as unknown as MeiliLoggerService);
    const reply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    const host = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => ({ id: 'request-id', url: '/test' }),
        getResponse: () => reply
      })
    } as unknown as ArgumentsHost;

    filter.catch(
      applicationError(ApplicationErrorCode.PASSWORD_RESET_SEND_TOO_MANY_REQUESTS),
      host
    );

    expect(reply.code).toHaveBeenCalledWith(429);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
      code: ApplicationErrorCode.PASSWORD_RESET_SEND_TOO_MANY_REQUESTS,
      message: 'Rate limit exceeded.',
      path: '/test',
      statusCode: 429
    }));
  })

  it('preserves the machine code when production hides a 5xx message', () => {
    const originalAppEnv = process.env.APP_ENV;
    process.env.APP_ENV = 'production';

    try {
      const filter = new HttpExceptionFilter({
        forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
      } as unknown as MeiliLoggerService);
      const reply = {
        code: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      const host = {
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => ({ id: 'request-id', url: '/test' }),
          getResponse: () => reply
        })
      } as unknown as ArgumentsHost;

      filter.catch(
        applicationError(ApplicationErrorCode.PASSWORD_ENCODING_FAILED),
        host
      );

      expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({
        code: ApplicationErrorCode.PASSWORD_ENCODING_FAILED,
        message: 'Internal Server Error',
        statusCode: 500
      }));
    } finally {
      if (originalAppEnv === undefined) {
        delete process.env.APP_ENV;
      } else {
        process.env.APP_ENV = originalAppEnv;
      }
    }
  })
});
