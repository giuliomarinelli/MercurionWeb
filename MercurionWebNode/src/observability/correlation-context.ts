import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

export const CORRELATION_ID_HEADER = 'x-correlation-id'
export const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

export interface CorrelationContext {
  readonly correlationId: string
  readonly parentCorrelationId?: string
  readonly transport: 'http' | 'graphql' | 'socket.io' | 'nats' | 'background'
}

const storage = new AsyncLocalStorage<CorrelationContext>()

export function isValidCorrelationId(value: unknown): value is string {
  return typeof value === 'string' && CORRELATION_ID_PATTERN.test(value)
}

export function createCorrelationId(): string {
  return randomUUID()
}

export function resolveCorrelationId(value: unknown): string {
  return isValidCorrelationId(value) ? value : createCorrelationId()
}

export function createCorrelationContext(
  transport: CorrelationContext['transport'],
  inboundId?: unknown,
  parentCorrelationId?: string
): CorrelationContext {
  const correlationId = resolveCorrelationId(inboundId)
  return parentCorrelationId && isValidCorrelationId(parentCorrelationId)
    ? { correlationId, parentCorrelationId, transport }
    : { correlationId, transport }
}

export function getCorrelationContext(): CorrelationContext | undefined {
  return storage.getStore()
}

export function getCorrelationId(): string | undefined {
  return getCorrelationContext()?.correlationId
}

export function runWithCorrelationContext<T>(
  context: CorrelationContext,
  callback: () => T
): T {
  return storage.run(context, callback)
}

export function withCorrelationHeader(
  headers: Record<string, string>,
  context: CorrelationContext = createCorrelationContext('background')
): Record<string, string> {
  return { ...headers, [CORRELATION_ID_HEADER]: context.correlationId }
}

export interface CorrelatedEnvelope<T> {
  readonly correlationId: string
  readonly payload: T
}

export function toCorrelatedEnvelope<T>(
  payload: T,
  context: CorrelationContext = createCorrelationContext('background')
): CorrelatedEnvelope<T> {
  return { correlationId: context.correlationId, payload }
}

export function readCorrelatedEnvelope<T>(
  envelope: CorrelatedEnvelope<T>
): CorrelationContext {
  return createCorrelationContext('nats', envelope.correlationId)
}
