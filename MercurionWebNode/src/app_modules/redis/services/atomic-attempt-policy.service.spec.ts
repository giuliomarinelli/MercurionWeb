import { atomicAttemptPolicies, AtomicAttemptPolicyService } from './atomic-attempt-policy.service'

describe('AtomicAttemptPolicyService', () => {
  it('keeps the approved thresholds and windows in one registry', () => {
    expect(atomicAttemptPolicies.mfaFailure.limit).toBe(5)
    expect(atomicAttemptPolicies.mfaFailure.windowSeconds).toBe(600)
    expect(atomicAttemptPolicies.mfaFailure.lockSeconds).toBe(600)
    expect(atomicAttemptPolicies.mfaSend.lockWhen).toBe('above')
    expect(atomicAttemptPolicies.feedbackSend.lockWhen).toBe('atLeast')
  })

  it('delegates a single atomic Redis operation with both keys', async () => {
    const evalMock = jest.fn().mockResolvedValue([1, 2, 0])
    const redis = { eval: evalMock } as any
    const service = new AtomicAttemptPolicyService(redis)

    await expect(service.recordFailure(
      'mfaFailure',
      'counter' as any,
      'lock' as any
    )).resolves.toEqual({ allowed: true, count: 2, locked: false })

    expect(evalMock).toHaveBeenCalledTimes(1)
    expect(evalMock.mock.calls[0][1]).toEqual(['counter', 'lock'])
    expect(evalMock.mock.calls[0][2]).toEqual([
      '600',
      '5',
      'atLeast',
      '600'
    ])
  })

  it('reports a threshold transition as denied and locked', async () => {
    const redis = { eval: jest.fn().mockResolvedValue([0, 5, 1]) } as any
    const service = new AtomicAttemptPolicyService(redis)

    await expect(service.recordFailure(
      'mfaFailure',
      'counter' as any,
      'lock' as any
    )).resolves.toEqual({ allowed: false, count: 5, locked: true })
  })
})
