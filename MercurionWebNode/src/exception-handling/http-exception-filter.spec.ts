import { HttpExceptionFilter } from './http-exception-filter';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { ArgumentsHost } from '@nestjs/common';
import type { HttpErrorRes } from 'src/Models/error-res.dto';
import {
  ApplicationErrorCode,
  applicationError
} from './application-error';

describe('HttpExceptionFilter', () => {
  it('should create an instance', () => {
    const filter = new HttpExceptionFilter({
      forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
    } as unknown as MeiliLoggerService, false);
    expect(filter).toBeInstanceOf(HttpExceptionFilter);
  });

  it('maps canonical codes to the preserved REST status and public message', () => {
    const filter = new HttpExceptionFilter({
      forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
    } as unknown as MeiliLoggerService, false);
    let sent: HttpErrorRes | undefined;
    const reply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn((body: HttpErrorRes) => { sent = body })
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
    expect(sent).toMatchObject({
      code: ApplicationErrorCode.PASSWORD_RESET_SEND_TOO_MANY_REQUESTS,
      message: 'Rate limit exceeded.',
      path: '/test',
      status: 429,
      statusCode: 429
    });
    expect(sent?.correlationId).toMatch(/^request-id-/);
    expect(sent?.requestId).toBe(sent?.correlationId);
  })

  it('preserves the machine code when production hides a 5xx message', () => {
    const filter = new HttpExceptionFilter({
      forContext: jest.fn().mockReturnValue({ warn: jest.fn() }),
    } as unknown as MeiliLoggerService, true);
      let sent: HttpErrorRes | undefined;
    const reply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn((body: HttpErrorRes) => { sent = body })
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

      expect(sent).toMatchObject({
        code: ApplicationErrorCode.PASSWORD_ENCODING_FAILED,
        message: 'Internal Server Error',
        status: 500,
        statusCode: 500
      });
      expect(sent?.correlationId).toMatch(/^request-id-/);
  })
});
