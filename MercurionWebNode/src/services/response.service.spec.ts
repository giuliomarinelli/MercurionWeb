import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResponseService } from './response.service';

describe('ResponseService', () => {
  let service: ResponseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseService],
    }).compile();

    service = module.get<ResponseService>(ResponseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ok', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns a ConfirmDTO with default status', () => {
      const result = service.ok('done');
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        timestamp: new Date('2023-01-01T00:00:00.000Z').toISOString(),
        message: 'done'
      });
    });

    it('allows overriding the status code', () => {
      const result = service.ok('created', HttpStatus.CREATED);
      expect(result.statusCode).toBe(HttpStatus.CREATED);
      expect(result.message).toBe('created');
    });
  });
});
