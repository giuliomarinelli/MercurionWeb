import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { Redis } from 'ioredis';

describe('RedisService', () => {
  let service: RedisService;
  let redisClient: Redis;

  beforeEach(async () => {
    // Mock del client Redis
    redisClient = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      hset: jest.fn(),
      hget: jest.fn(),
      hdel: jest.fn(),
      hgetall: jest.fn(),
      hkeys: jest.fn(),
    } as unknown as Redis;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
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
    (redisClient.set as jest.Mock).mockResolvedValue('OK');

    const result = await service.setCache('test-key', 'test-value', 60);
    expect(result).toBe('OK');
    expect(redisClient.set).toHaveBeenCalledWith('test-key', 'test-value', 'EX', 60);
  });

  it('should set a cache without expiry', async () => {
    (redisClient.set as jest.Mock).mockResolvedValue('OK');

    const result = await service.setCache('test-key', 'test-value');
    expect(result).toBe('OK');
    expect(redisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
  });

  it('should get a cache value', async () => {
    (redisClient.get as jest.Mock).mockResolvedValue('test-value');

    const result = await service.getCache('test-key');
    expect(result).toBe('test-value');
    expect(redisClient.get).toHaveBeenCalledWith('test-key');
  });

  it('should delete a cache key', async () => {
    (redisClient.del as jest.Mock).mockResolvedValue(1);

    const result = await service.deleteCache('test-key');
    expect(result).toBe(1);
    expect(redisClient.del).toHaveBeenCalledWith('test-key');
  });

  it('should set a hash field', async () => {
    (redisClient.hset as jest.Mock).mockResolvedValue(1);

    const result = await service.hsetHash('test-hash', 'field', 'value');
    expect(result).toBe(1);
    expect(redisClient.hset).toHaveBeenCalledWith('test-hash', 'field', 'value');
  });

  it('should get a hash field', async () => {
    (redisClient.hget as jest.Mock).mockResolvedValue('value');

    const result = await service.hgetHash('test-hash', 'field');
    expect(result).toBe('value');
    expect(redisClient.hget).toHaveBeenCalledWith('test-hash', 'field');
  });

  it('should delete a hash field', async () => {
    (redisClient.hdel as jest.Mock).mockResolvedValue(1);

    const result = await service.hdelHash('test-hash', 'field');
    expect(result).toBe(1);
    expect(redisClient.hdel).toHaveBeenCalledWith('test-hash', 'field');
  });

  it('should get all fields and values from a hash', async () => {
    const mockHash = { field1: 'value1', field2: 'value2' };
    (redisClient.hgetall as jest.Mock).mockResolvedValue(mockHash);

    const result = await service.hgetallHash('test-hash');
    expect(result).toEqual(mockHash);
    expect(redisClient.hgetall).toHaveBeenCalledWith('test-hash');
  });

  it('should get all keys from a hash', async () => {
    const mockKeys = ['field1', 'field2'];
    (redisClient.hkeys as jest.Mock).mockResolvedValue(mockKeys);

    const result = await service.hkeysHash('test-hash');
    expect(result).toEqual(mockKeys);
    expect(redisClient.hkeys).toHaveBeenCalledWith('test-hash');
  });
});
