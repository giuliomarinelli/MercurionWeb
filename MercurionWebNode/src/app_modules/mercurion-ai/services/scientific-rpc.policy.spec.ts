import { ConfigService } from '@nestjs/config'
import { NATS_CONTRACT_REGISTRY } from '@mercurion/rest-contracts'
import { NEVER, Subject, of, throwError } from 'rxjs'
import { InMemoryMetrics } from 'src/observability/metrics'
import { ScientificRpcPolicy } from './scientific-rpc.policy'

const request = { smiles: 'CCO', accessToken: '0123456789' }
const response = { 'SR-MMP': { probability: 0.2, threshold: 0.5, is_positive: false } }

describe('ScientificRpcPolicy', () => {
  let metrics: InMemoryMetrics
  let policy: ScientificRpcPolicy

  beforeEach(() => {
    metrics = new InMemoryMetrics()
    const values: Record<string, number> = {
      'App.maxNatsPayloadBytes': 4096,
      'App.scientificRpc.maxInFlight': 1,
      'App.scientificRpc.maxQueue': 2,
      'App.scientificRpc.queueWaitMs': 250,
      'App.scientificRpc.timeoutMs': 3000,
    }
    policy = new ScientificRpcPolicy({
      getOrThrow: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService, metrics)
  })

  afterEach(() => jest.useRealTimers())

  const execute = (send: jest.Mock, payload = request) => policy.execute({
    operation: 'mercurion.inference.top4',
    client: { send },
    subject: 'development.inference.tox21.smiles',
    contract: NATS_CONTRACT_REGISTRY.inferenceTop4,
    payload,
  })

  it('returns validated responses and records bounded success metrics', async () => {
    await expect(execute(jest.fn(() => of(response)))).resolves.toEqual(response)
    expect(metrics.snapshot()).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'count', outcome: 'success', operation: 'mercurion.inference.top4' }),
    ]))
  })

  it('rejects oversized and semantically invalid requests before dispatch', async () => {
    const send = jest.fn()
    await expect(execute(send, { ...request, smiles: 'x'.repeat(5000) }))
      .rejects.toMatchObject({ code: 'TOX21_PAYLOAD_TOO_LARGE' })
    expect(send).not.toHaveBeenCalled()
    await expect(execute(send, { ...request, smiles: '' })).rejects.toMatchObject({ code: 'TOX21_INVALID_PAYLOAD' })
  })

  it('classifies timeout, unavailable transport and malformed responses distinctly', async () => {
    jest.useFakeTimers()
    const timedOut = execute(jest.fn(() => NEVER))
    const timedOutExpectation = expect(timedOut).rejects.toMatchObject({ code: 'TOX21_TIMEOUT' })
    await jest.advanceTimersByTimeAsync(3000)
    await timedOutExpectation
    await expect(execute(jest.fn(() => throwError(() => new Error('offline')))))
      .rejects.toMatchObject({ code: 'SCIENTIFIC_RPC_UNAVAILABLE' })
    await expect(execute(jest.fn(() => of({ invalid: true })))).rejects
      .toMatchObject({ code: 'SCIENTIFIC_RPC_INVALID_RESPONSE' })
  })

  it('bounds FIFO work, rejects overflow and recovers after release', async () => {
    const first = new Subject<typeof response>()
    const send = jest.fn()
      .mockReturnValueOnce(first)
      .mockReturnValue(of(response))
    const active = execute(send)
    const queuedOne = execute(send)
    const queuedTwo = execute(send)
    await expect(execute(send)).rejects.toMatchObject({ code: 'SCIENTIFIC_RPC_OVERLOADED' })
    expect(send).toHaveBeenCalledTimes(1)
    first.next(response)
    first.complete()
    await expect(active).resolves.toEqual(response)
    await expect(queuedOne).resolves.toEqual(response)
    await expect(queuedTwo).resolves.toEqual(response)
    await expect(execute(send)).resolves.toEqual(response)
  })

  it('expires queued work after the approved bounded wait', async () => {
    jest.useFakeTimers()
    const active = execute(jest.fn(() => NEVER))
    const queued = execute(jest.fn(() => of(response)))
    const queuedExpectation = expect(queued).rejects.toMatchObject({ code: 'SCIENTIFIC_RPC_OVERLOADED' })
    await jest.advanceTimersByTimeAsync(250)
    await queuedExpectation
    const activeExpectation = expect(active).rejects.toMatchObject({ code: 'TOX21_TIMEOUT' })
    await jest.advanceTimersByTimeAsync(2750)
    await activeExpectation
  })
})
