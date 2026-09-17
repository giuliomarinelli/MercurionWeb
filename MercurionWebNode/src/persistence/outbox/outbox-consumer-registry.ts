import { Injectable } from '@nestjs/common'
import { OutboxConsumer, OutboxEventEnvelope } from './outbox-event-envelope'

export type OutboxConsumerHandler<TPayload extends Record<string, unknown> = Record<string, unknown>> =
  (event: OutboxEventEnvelope<TPayload>) => Promise<void>

@Injectable()
export class OutboxConsumerRegistry {
  private readonly consumers = new Map<string, OutboxConsumerHandler>()

  register<TPayload extends Record<string, unknown>>(
    eventType: string,
    version: number,
    handler: OutboxConsumerHandler<TPayload>
  ): void {
    const key = this.key(eventType, version)
    if (this.consumers.has(key)) {
      throw new Error(`Outbox consumer already registered for ${key}`)
    }
    this.consumers.set(key, handler as OutboxConsumerHandler)
  }

  registerConsumer<TPayload extends Record<string, unknown>>(
    consumer: OutboxConsumer<TPayload>
  ): void {
    this.register(consumer.eventType, consumer.version, consumer.handle.bind(consumer))
  }

  resolve(eventType: string, version: number): OutboxConsumerHandler | undefined {
    return this.consumers.get(this.key(eventType, version))
  }

  private key(eventType: string, version: number): string {
    return `${eventType}:v${version}`
  }
}
