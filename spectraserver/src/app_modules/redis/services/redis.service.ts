import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {

  constructor(
    private readonly redisClient: Redis
  ) { }

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

  
}
