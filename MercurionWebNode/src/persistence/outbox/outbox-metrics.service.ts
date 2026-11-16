import { Injectable } from '@nestjs/common'
import { OutboxEventEnvelope } from './outbox-event-envelope'

export interface OutboxMetricsSnapshot {
  pending: number
  oldestPendingAgeMs: number
  attempts: number
  terminalFailures: number
  consumerLatencyMs: number
}

@Injectable()
export class OutboxMetricsService {
  private snapshot: OutboxMetricsSnapshot = {
    pending: 0,
    oldestPendingAgeMs: 0,
    attempts: 0,
    terminalFailures: 0,
    consumerLatencyMs: 0
  }

  recordAttempt(): void {
    this.snapshot.attempts += 1
  }

  recordTerminalFailure(): void {
    this.snapshot.terminalFailures += 1
  }

  recordConsumerLatency(startedAt: number): void {
    this.snapshot.consumerLatencyMs += Math.max(0, Date.now() - startedAt)
  }

  setBacklog(pending: number, oldestCreatedAt?: number): void {
    this.snapshot.pending = pending
    this.snapshot.oldestPendingAgeMs = oldestCreatedAt
      ? Math.max(0, Date.now() - oldestCreatedAt)
      : 0
  }

  getSnapshot(): OutboxMetricsSnapshot {
    return { ...this.snapshot }
  }

  recordEvent(event: OutboxEventEnvelope): void {
    this.recordAttempt()
    this.recordConsumerLatency(Number(event.occurredAt))
  }
}
