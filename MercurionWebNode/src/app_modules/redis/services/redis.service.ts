import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import type {
  RedisKey,
  RedisKeyPattern,
  RedisTtlSeconds
} from '../contracts/redis-contracts';

@Injectable()
export class RedisService implements OnModuleDestroy {

  private readonly logger: MeiliContextLogger

  constructor(
    private readonly redisClient: Redis,
    loggerFactory: MeiliLoggerService
  ) {
    this.logger = loggerFactory.forContext(RedisService.name)
  }


  public getClient(): Redis {
    return this.redisClient
  }

  public async getNotifyKeyspaceEvents(): Promise<string> {
    const response = await this.redisClient.config('GET', 'notify-keyspace-events')
    return Array.isArray(response) && typeof response[1] === 'string' ? response[1] : ''
  }

  async onModuleDestroy(): Promise<void> {
    await this.redisClient.quit()
  }

  // Set TTL for a specific key
  public async setTTL(key: RedisKey, ttl: RedisTtlSeconds): Promise<void> {
    await this.redisClient.expire(key, ttl)
  }

  // String operations (Key-Value store)
  public async set(key: RedisKey, value: string, ttl?: RedisTtlSeconds): Promise<'OK'> {
    if (ttl) {
      return this.redisClient.set(key, value, 'EX', ttl)
    }
    return this.redisClient.set(key, value);
  }

  public async get(key: RedisKey): Promise<string | null> {
    return this.redisClient.get(key)
  }

  public async del(key: RedisKey): Promise<number> {
    return this.redisClient.del(key)
  }

  public async exists(key: RedisKey): Promise<boolean> {
    return (await this.redisClient.exists(key)) === 1
  }

  public async scan(pattern: RedisKeyPattern, cursor: string = '0', count = 100): Promise<{ cursor: string; keys: RedisKey[] }> {
    const [nextCursor, keys] = await this.redisClient.scan(
      cursor,
      'MATCH', pattern,
      'COUNT', String(count),
    );
    return { cursor: nextCursor, keys: keys as RedisKey[] }
  }

  public async scanIterate(pattern: RedisKeyPattern): Promise<RedisKey[]> {

    const keys: RedisKey[] = []
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
  public async hset(hash: RedisKey, key: string, value: string): Promise<number> {
    return this.redisClient.hset(hash, key, value)
  }

  public async hget(hash: RedisKey, key: string): Promise<string | null> {
    return this.redisClient.hget(hash, key)
  }

  public async hdel(hash: RedisKey, key: string): Promise<number> {
    return this.redisClient.hdel(hash, key)
  }

  public async hgetall(hash: RedisKey): Promise<Record<string, string>> {
    return this.redisClient.hgetall(hash)
  }

  public async hkeys(hash: RedisKey): Promise<string[]> {
    return this.redisClient.hkeys(hash)
  }

  public async sadd(setKey: RedisKey, value: string): Promise<number> {
    return this.redisClient.sadd(setKey, value)
  }

  public async sismember(setKey: RedisKey, value: string): Promise<boolean> {
    return (await this.redisClient.sismember(setKey, value)) === 1
  }

  public async srem(setKey: RedisKey, value: string): Promise<number> {
    return this.redisClient.srem(setKey, value);
  }

  async scanKeysByPattern(pattern: RedisKeyPattern): Promise<RedisKey[]> {
    const keys: RedisKey[] = [];
    let cursor = '0';
    this.logger.debug?.('🔍 Scanning pattern:', pattern);

    do {
      const [nextCursor, results] = await this.redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
      this.logger.debug?.('→ SCAN returned cursor:', nextCursor, '| results:', results);
      cursor = nextCursor;
      keys.push(...results as RedisKey[]);
    } while (cursor !== '0');

    this.logger.debug?.('✅ Total keys found:', keys.length.toString());
    return keys;
  }

  async keys(pattern: RedisKeyPattern): Promise<string[]> {
    return await this.redisClient.keys(pattern)
  }

  public async incr(key: RedisKey): Promise<number> {
    return this.redisClient.incr(key)
  }

  public async ttl(key: RedisKey): Promise<number> {
    return this.redisClient.ttl(key)
  }

  public async smembers(key: RedisKey): Promise<string[]> {
    return this.redisClient.smembers(key)
  }

  public async unlink(key: RedisKey): Promise<number> {
    return this.redisClient.unlink(key)
  }

  public async setIfNotExists(
    key: RedisKey,
    value: string,
    ttl: RedisTtlSeconds
  ): Promise<'OK' | null> {
    return this.redisClient.set(key, value, 'EX', ttl, 'NX')
  }



}
