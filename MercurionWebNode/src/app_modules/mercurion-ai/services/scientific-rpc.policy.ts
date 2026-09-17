import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { ClientProxy } from '@nestjs/microservices'
import {
  assertNatsRequest,
  assertNatsResponse,
  type NatsContract,
} from '@mercurion/rest-contracts'
import { firstValueFrom, timeout, TimeoutError } from 'rxjs'
import { ApplicationError, ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { MetricsPort, type MetricOutcome } from 'src/observability/metrics'

interface QueueWaiter {
  readonly resolve: () => void
  readonly reject: (error: ApplicationError) => void
  readonly timer: ReturnType<typeof setTimeout>
}

export interface ScientificRpcRequest<Request, Response> {
  readonly operation: string
  readonly client: Pick<ClientProxy, 'send'>
  readonly subject: string
  readonly contract: NatsContract<Request, Response>
  readonly payload: Request
  readonly isRemoteError?: (response: Response) => boolean
}

@Injectable()
export class ScientificRpcPolicy {
  private readonly maxPayloadBytes: number
  private readonly maxInFlight: number
  private readonly maxQueue: number
  private readonly queueWaitMs: number
  private readonly timeoutMs: number
  private inFlight = 0
  private readonly queue: QueueWaiter[] = []

  constructor(config: ConfigService, private readonly metrics: MetricsPort) {
    this.maxPayloadBytes = config.getOrThrow<number>('App.maxNatsPayloadBytes')
    this.maxInFlight = config.getOrThrow<number>('App.scientificRpc.maxInFlight')
    this.maxQueue = config.getOrThrow<number>('App.scientificRpc.maxQueue')
    this.queueWaitMs = config.getOrThrow<number>('App.scientificRpc.queueWaitMs')
    this.timeoutMs = config.getOrThrow<number>('App.scientificRpc.timeoutMs')
  }

  async execute<Request, Response>(request: ScientificRpcRequest<Request, Response>): Promise<Response> {
    this.validateRequest(request.contract, request.payload)
    await this.acquire(request.operation)
    const startedAt = Date.now()
    let outcome: MetricOutcome = 'success'
    try {
      let response: Response
      try {
        response = await firstValueFrom(
          request.client.send<Response, Request>(request.subject, request.payload).pipe(timeout(this.timeoutMs)),
        )
      } catch (error) {
        if (error instanceof TimeoutError) {
          outcome = 'timeout'
          throw applicationError(ApplicationErrorCode.TOX21_TIMEOUT, undefined, { operation: request.operation }, error)
        }
        outcome = 'unavailable'
        throw applicationError(ApplicationErrorCode.SCIENTIFIC_RPC_UNAVAILABLE, undefined, { operation: request.operation }, error)
      }

      try {
        assertNatsResponse(request.contract, response)
      } catch (error) {
        outcome = 'invalid-response'
        throw applicationError(ApplicationErrorCode.SCIENTIFIC_RPC_INVALID_RESPONSE, undefined, { operation: request.operation }, error)
      }
      if (request.isRemoteError?.(response)) outcome = 'remote-error'
      return response
    } finally {
      this.record(request.operation, outcome, Date.now() - startedAt)
      this.release()
    }
  }

  private validateRequest<Request>(contract: NatsContract<Request, unknown>, payload: Request): void {
    let serialized: string
    try {
      const value = JSON.stringify(payload)
      if (value === undefined) throw new TypeError('Scientific RPC payload is not JSON serializable')
      serialized = value
    } catch (error) {
      throw applicationError(ApplicationErrorCode.TOX21_INVALID_PAYLOAD, undefined, undefined, error)
    }
    if (Buffer.byteLength(serialized, 'utf8') > this.maxPayloadBytes) {
      throw applicationError(ApplicationErrorCode.TOX21_PAYLOAD_TOO_LARGE)
    }
    try {
      assertNatsRequest(contract, payload)
    } catch (error) {
      throw applicationError(ApplicationErrorCode.TOX21_INVALID_PAYLOAD, undefined, undefined, error)
    }
  }

  private async acquire(operation: string): Promise<void> {
    if (this.inFlight < this.maxInFlight) {
      this.inFlight += 1
      return
    }
    if (this.queue.length >= this.maxQueue) {
      this.record(operation, 'overload', 0)
      throw applicationError(ApplicationErrorCode.SCIENTIFIC_RPC_OVERLOADED)
    }
    await new Promise<void>((resolve, reject) => {
      const waiter: QueueWaiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          const index = this.queue.indexOf(waiter)
          if (index >= 0) this.queue.splice(index, 1)
          this.record(operation, 'overload', this.queueWaitMs)
          reject(applicationError(ApplicationErrorCode.SCIENTIFIC_RPC_OVERLOADED))
        }, this.queueWaitMs),
      }
      this.queue.push(waiter)
    })
  }

  private release(): void {
    const waiter = this.queue.shift()
    if (waiter) {
      clearTimeout(waiter.timer)
      waiter.resolve()
      return
    }
    this.inFlight -= 1
  }

  private record(operation: string, outcome: MetricOutcome, latencyMs: number): void {
    this.metrics.record({ name: 'count', value: 1, transport: 'nats', operation, outcome })
    this.metrics.record({ name: 'latency_ms', value: latencyMs, transport: 'nats', operation, outcome })
  }
}
