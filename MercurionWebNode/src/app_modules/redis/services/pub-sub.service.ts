import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service';
import { Redis } from 'ioredis';
import { OAuth2AccessTokenRefreshService } from 'src/app_modules/oauth2-client/services/access-token-refresh.service';
import { UUID } from 'crypto';
import { Server } from 'socket.io';
import { SessionService } from 'src/app_modules/auth/services/session.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';

@Injectable()
export class PubSubService implements OnModuleInit {

  private readonly subscriber: Redis
  private readonly logger: MeiliContextLogger
  private socketServer: Server | undefined

  constructor(
    private readonly redisService: RedisService,
    private readonly oauth2_accessTokenRefreshService: OAuth2AccessTokenRefreshService,
    private readonly sessionService: SessionService,
    loggerFactory: MeiliLoggerService,
  ) {
    this.logger = loggerFactory.forContext(PubSubService.name)
    this.subscriber = this.redisService.getClient().duplicate()
    this.subscriber.on('error', (e) => this.logger.error(`Redis subscriber error: ${e?.message || e}`))
  }

  async onModuleInit() {
    await this.ensureKeyspaceEvents()     // log se non correttamente configurato
    await this.subscribeToKeyspaceEvents() // psubscribe
  }

  public setSocketServer(server: Server): void {
    this.socketServer = server
  }

  private async ensureKeyspaceEvents() {
    try {
      const client = this.redisService.getClient()
      const res = await client.config('GET', 'notify-keyspace-events')
      const current = Array.isArray(res) ? res[1] as string : ''
      if (!current || !/[E]/.test(current) || !/[x]/.test(current) || !/[g]/.test(current)) {
        this.logger.warn(
          `Redis notify-keyspace-events="${current}". Si consiglia almeno "Exg" per expired/del keyevents.`,
        )
      }
    } catch {
      this.logger.warn('Redis Keyspace Events are not correctly configured')
      // Alcuni managed Redis non permettono CONFIG GET
    }
  }

  private async subscribeToKeyspaceEvents(): Promise<void> {
    await (this.subscriber as any).psubscribe('__keyevent@0__:*');
    this.subscriber.on('pmessage', (_pattern, channel, key) => {
      try {
        const event = channel.split(':').pop(); // 'expired' | 'del' | ...
        if (!event) return;

        if (key.startsWith('session:') && (event === 'expired' || event === 'del')) {
          this.handleSessionEvent(event, key)
        }

        if (key.startsWith('access_token:') && event === 'expired') {
          this.handleAccessTokenExpired(key)
        }
      } catch (e) {
        this.logger.error(`PubSub handler error for key="${key}": ${e?.message || e}`)
      }
    })
  }

  // access_token:{provider}:{userId?}
  private async handleAccessTokenExpired(key: string) {
    this.logger.log(`Access token key expired: ${key}`)
    const [, provider, ...userIdParts] = key.split(':')
    const userId = userIdParts.length > 0 ? (userIdParts.join(':') as UUID) : undefined

    // anti-thrashing lock (30s)
    const lockKey = `oauth2:refresh_lock:${provider}:${userId ?? '__global__'}`
    const ok = await this.redisService.getClient().set(lockKey, '1', 'EX', 30, 'NX')
    if (!ok) {
      this.logger.debug?.(`Skip refresh (locked) for provider=${provider} userId=${userId ?? '[none]'}`)
      return
    }

    try {
      await this.oauth2_accessTokenRefreshService.refreshAccessToken(provider, userId);
      this.logger.log(`Access token refreshed for provider=${provider} userId=${userId ?? '[none]'}`)
    } catch (err) {
      this.logger.error(`Error refreshing access token for provider=${provider} userId=${userId ?? '[none]'}: ${err?.message || err}`)
    } finally {
      await this.redisService.getClient().del(lockKey)
    }
  }

  // session:{sid}:{uid}
  private async handleSessionEvent(event: 'expired' | 'del', key: string): Promise<void> {
    
    const parts = key.split(':') // ["session", sid, uid]
    if (parts.length !== 3) {
      this.logger.warn(`Unexpected session key format on ${event}: ${key}`)
      return
    }
    const sessionId = parts[1]
    const userId = parts[2]

    try {
      const jtis = await this.sessionService.getJtiListBySessionId(sessionId)
      for (const jti of jtis) {
        await this.sessionService.revokeToken(jti)
      }
    } catch (e) {
      this.logger.warn(`Failed to revoke JTIs for session ${sessionId}: ${e?.message || e}`)
    }

    try {
      const client = this.redisService.getClient()
      const pipe = client.pipeline()
      pipe.srem(`user_sessions:${userId}`, sessionId)
      await pipe.exec()
    } catch (e) {
      this.logger.warn(`Failed to cleanup indexes for session ${sessionId}: ${e?.message || e}`)
    }

    if (this.socketServer) {
      try {
        this.socketServer.to(`ws_session:${sessionId}`).emit('sv.pub.session_expired', {
          detail: 'session expired',
          reason: event,
        })
        this.socketServer.in(`ws_session:${sessionId}`).socketsLeave(`ws_session:${sessionId}`)
      } catch (e) {
        this.logger.warn(`Failed WS notify/leave for session ${sessionId}: ${e?.message || e}`)
      }
    }

    this.logger.log(`🛑 Session ${sessionId} (${event}) → revoked JTIs, cleaned indexes, notified WS`)
  }

  // Pub/Sub utilità opzionali
  public async publish(channel: string, message: string): Promise<void> {
    await this.redisService.getClient().publish(channel, message)
  }

  public subscribe(channel: string, callback: (message: string) => void): void {
    this.subscriber.subscribe(channel)
    this.subscriber.on('message', (chan, message) => {
      if (chan === channel) callback(message)
    })
  }
}
