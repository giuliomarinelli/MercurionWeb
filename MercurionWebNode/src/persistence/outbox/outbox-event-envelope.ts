import { UUID } from 'crypto'

export type OutboxEventState = 'pending' | 'processing' | 'succeeded' | 'dead_letter'

export interface OutboxEventEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: UUID
  readonly eventType: string
  readonly version: number
  readonly aggregateId: UUID
  readonly correlationId: UUID | null
  readonly causationId: UUID | null
  readonly payload: TPayload
  readonly occurredAt: string
  readonly createdAt: string
  readonly availableAt: string
  readonly attemptCount: number
  readonly state: OutboxEventState
  readonly claimedAt: string | null
  readonly claimedBy: string | null
  readonly processedAt: string | null
  readonly lastError: string | null
}

export interface OutboxConsumer<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  readonly eventType: string
  readonly version: number
  handle(event: OutboxEventEnvelope<TPayload>): Promise<void>
}
