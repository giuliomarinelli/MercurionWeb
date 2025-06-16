import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service'; // Importa RedisService
import { Redis } from 'ioredis';
import { AccessTokenRefreshService } from 'src/app_modules/oauth2-client/services/access-token-refresh.service';
import { UUID } from 'crypto';

@Injectable()
export class PubSubService implements OnModuleInit {

  private readonly subscriber: Redis
  private readonly logger = new Logger(PubSubService.name)

  constructor(
    private readonly redisService: RedisService,
    private readonly accessTokenRefreshService: AccessTokenRefreshService
  ) {
    // Crea un duplicato del client Redis per il Pub/Sub
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.subscriber = this.redisService.getClient().duplicate()
  }

  onModuleInit() {
    // Iscriviti agli eventi di scadenza e cancellazione chiavi
    this.subscribeToKeyspaceEvents()
  }

  private subscribeToKeyspaceEvents(): void {
    this.subscriber.subscribe('__keyevent@0__:expired')
    this.subscriber.subscribe('__keyevent@0__:del')

    this.subscriber.on('message', (channel, key) => {
      if (
        (channel === '__keyevent@0__:expired' || channel === '__keyevent@0__:del') &&
        key.startsWith('access_token:')
      ) {
        this.handleAccessTokenExpired(channel, key); // <-- NO await, NO return
      }
    })
  }

  private async handleAccessTokenExpired(channel: string, key: string) {
    this.logger.log(`Access token key expired or deleted: ${key}`);

    // Estrai provider e userId
    const [, provider, ...userIdParts] = key.split(':');
    const userId = userIdParts.length > 0 ? userIdParts.join(':') : undefined;

    this.logger.log(`Trigger refresh for provider=${provider} userId=${userId ?? '[none]'}`);

    try {
      await this.accessTokenRefreshService.refreshAccessToken(provider, userId as UUID);
      this.logger.log(`Access token refreshed successfully for provider=${provider} userId=${userId ?? '[none]'}`);
    } catch (err) {
      this.logger.error(
        `Error refreshing access token for provider=${provider} userId=${userId ?? '[none]'}: ${err?.message || err}`,
      );
    }
  }

  // Metodo per la pubblicazione, se necessario
  public async publish(channel: string, message: string): Promise<void> {
    await this.redisService.getClient().publish(channel, message);
  }

  // Metodo di sottoscrizione con callback personalizzabile
  public subscribe(channel: string, callback: (message: string) => void): void {
    this.subscriber.subscribe(channel)
    this.subscriber.on('message', (chan, message) => {
      if (chan === channel) callback(message)
    })
  }
}
