import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from './redis.service'; // Importa RedisService
import { Redis } from 'ioredis';

@Injectable()
export class PubSubService implements OnModuleInit {

  private readonly subscriber: Redis
  private readonly logger = new Logger(PubSubService.name)

  constructor(private readonly redisService: RedisService) {
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
      if (channel === '__keyevent@0__:expired' || channel === '__keyevent@0__:del') {
        this.logger.log(`Key \x1b[36m${key}\x1b[0m expired or deleted`)
        // Aggiungi la logica per notificare altri servizi, come il gestore di connessioni WebSocket
      }
    });
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
    });
  }
}
