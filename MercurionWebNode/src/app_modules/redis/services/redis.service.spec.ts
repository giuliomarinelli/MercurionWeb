import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { Redis } from 'ioredis';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('RedisService', () => {
  let service: RedisService;
  let redisClient: Redis;
  const setMock = jest.fn();
  const getMock = jest.fn();
  const delMock = jest.fn();
  const hsetMock = jest.fn();
  const hgetMock = jest.fn();
  const hdelMock = jest.fn();
  const hgetallMock = jest.fn();
  const hkeysMock = jest.fn();
  const mockLogger = {
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Mock del client Redis
    redisClient = {
      set: setMock,
      get: getMock,
      del: delMock,
      hset: hsetMock,
      hget: hgetMock,
      hdel: hdelMock,
      hgetall: hgetallMock,
      hkeys: hkeysMock,
    } as unknown as Redis;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: MeiliLoggerService,
          useValue: { forContext: jest.fn().mockReturnValue(mockLogger) },
        },
        {
          provide: Redis, // Fornisce un mock del Redis client
          useValue: redisClient,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Pulisce i mock dopo ogni test
  });

  it('should set a cache with expiry', async () => {
    setMock.mockResolvedValue('OK');
    const result = await service.set('test-key', 'test-value', 60);
    expect(result).toBe('OK');
    expect(setMock).toHaveBeenCalledWith('test-key', 'test-value', 'EX', 60);
  });

  it('should set a cache without expiry', async () => {
    setMock.mockResolvedValue('OK');
    const result = await service.set('test-key', 'test-value');
    expect(result).toBe('OK');
    expect(setMock).toHaveBeenCalledWith('test-key', 'test-value');
  });

  it('should get a cache value', async () => {
    getMock.mockResolvedValue('test-value');
    const result = await service.get('test-key');
    expect(result).toBe('test-value');
    expect(getMock).toHaveBeenCalledWith('test-key');
  });

  it('should delete a cache key', async () => {
    delMock.mockResolvedValue(1);
    const result = await service.del('test-key');
    expect(result).toBe(1);
    expect(delMock).toHaveBeenCalledWith('test-key');
  });

  it('should set a hash field', async () => {
    hsetMock.mockResolvedValue(1);
    const result = await service.hset('test-hash', 'field', 'value');
    expect(result).toBe(1);
    expect(hsetMock).toHaveBeenCalledWith('test-hash', 'field', 'value');
  });

  it('should get a hash field', async () => {
    hgetMock.mockResolvedValue('value');
    const result = await service.hget('test-hash', 'field');
    expect(result).toBe('value');
    expect(hgetMock).toHaveBeenCalledWith('test-hash', 'field');
  });

  it('should delete a hash field', async () => {
    hdelMock.mockResolvedValue(1);
    const result = await service.hdel('test-hash', 'field');
    expect(result).toBe(1);
    expect(hdelMock).toHaveBeenCalledWith('test-hash', 'field');
  });

  it('should get all fields and values from a hash', async () => {
    const mockHash = { field1: 'value1', field2: 'value2' };
    hgetallMock.mockResolvedValue(mockHash);
    const result = await service.hgetall('test-hash');
    expect(result).toEqual(mockHash);
    expect(hgetallMock).toHaveBeenCalledWith('test-hash');
  });

  it('should get all keys from a hash', async () => {
    const mockKeys = ['field1', 'field2'];
    hkeysMock.mockResolvedValue(mockKeys);
    const result = await service.hkeys('test-hash');
    expect(result).toEqual(mockKeys);
    expect(hkeysMock).toHaveBeenCalledWith('test-hash');
  });
});
