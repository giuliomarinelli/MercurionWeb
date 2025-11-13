import { Injectable, LoggerService } from '@nestjs/common';
import { Redis } from 'ioredis';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

@Injectable()
export class RedisService {

  private readonly logger: LoggerService

  constructor(
    private readonly redisClient: Redis,
    meiliLogger: MeiliLoggerService
  ) {
    this.logger = meiliLogger.forContext(RedisService.name)
  }


  public getClient(): Redis {
    return this.redisClient
  }

  // Set TTL for a specific key
  public async setTTL(key: string, ttlSeconds: number): Promise<void> {
    await this.redisClient.expire(key, ttlSeconds)
  }

  // String operations (Key-Value store)
  public async set(key: string, value: string, expireSeconds?: number): Promise<'OK'> {
    if (expireSeconds) {
      return this.redisClient.set(key, value, 'EX', expireSeconds)
    }
    return this.redisClient.set(key, value);
  }

  public async get(key: string): Promise<string | null> {
    return this.redisClient.get(key)
  }

  public async del(key: string): Promise<number> {
    return this.redisClient.del(key)
  }

  public async exists(key: string): Promise<boolean> {
    return (await this.redisClient.exists(key)) === 1
  }

  public async scan(pattern = '*', cursor: string = '0', count = 100): Promise<{ cursor: string; keys: string[] }> {
    const [nextCursor, keys] = await this.redisClient.scan(
      cursor,
      'MATCH', pattern,
      'COUNT', String(count),
    );
    return { cursor: nextCursor, keys }
  }

  public async scanIterate(pattern = '*'): Promise<string[]> {

    const keys: string[] = []
    let cursor = '0';
    do {
      const scanned = await this.scan(pattern, cursor, 1000)
      if (scanned.keys?.length) {
        keys.push(...scanned.keys)
      }
      cursor = scanned.cursor
    } while (cursor !== '0')

    return keys
    
  }

  // Hash operations
  public async hset(hash: string, key: string, value: string): Promise<number> {
    return this.redisClient.hset(hash, key, value)
  }

  public async hget(hash: string, key: string): Promise<string | null> {
    return this.redisClient.hget(hash, key)
  }

  public async hdel(hash: string, key: string): Promise<number> {
    return this.redisClient.hdel(hash, key)
  }

  public async hgetall(hash: string): Promise<Record<string, string>> {
    return this.redisClient.hgetall(hash)
  }

  public async hkeys(hash: string): Promise<string[]> {
    return this.redisClient.hkeys(hash)
  }

  public async sadd(setKey: string, value: string): Promise<number> {
    return this.redisClient.sadd(setKey, value)
  }

  public async sismember(setKey: string, value: string): Promise<boolean> {
    return (await this.redisClient.sismember(setKey, value)) === 1
  }

  public async srem(setKey: string, value: string): Promise<number> {
    return this.redisClient.srem(setKey, value);
  }

  async scanKeysByPattern(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    this.logger.debug?.('🔍 Scanning pattern:', pattern);

    do {
      const [nextCursor, results] = await this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
      this.logger.debug?.('→ SCAN returned cursor:', nextCursor, '| results:', results);
      cursor = nextCursor;
      keys.push(...results);
    } while (cursor !== '0');

    this.logger.debug?.('✅ Total keys found:', keys.length);
    return keys;
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redisClient.keys(pattern)
  }




}
