import { UUID } from 'crypto'

export interface BulkJoinSelectionInput {
  requestedIds: UUID[]
  selectAll: boolean
  maxCandidates?: number
}

export interface BulkJoinSelectionPlan {
  candidateIds: UUID[]
  excludedIds: UUID[]
}

export interface BulkJoinWriteSet {
  candidateIds: UUID[]
  alreadyJoinedIds: UUID[]
  toInsertIds: UUID[]
}

export class BulkJoinLimitExceededError extends Error {
  readonly code = 'BULK_JOIN_LIMIT_EXCEEDED'

  constructor(
    readonly candidateCount: number,
    readonly maxCandidates: number
  ) {
    super(`Bulk selection contains ${candidateCount} candidates; maximum is ${maxCandidates}`)
    this.name = 'BulkJoinLimitExceededError'
  }
}

export function distinctIds(ids: UUID[]): UUID[] {
  return Array.from(new Set(ids))
}

export function planBulkJoinSelection(
  input: BulkJoinSelectionInput,
  ownedIds: UUID[]
): BulkJoinSelectionPlan {
  const requestedIds = distinctIds(input.requestedIds)
  const owned = new Set(ownedIds)

  const plan = !input.selectAll
    ? {
      candidateIds: requestedIds.filter(id => owned.has(id)).sort(),
      excludedIds: []
    }
    : {
      candidateIds: distinctIds(ownedIds).filter(id => !new Set(requestedIds).has(id)).sort(),
      excludedIds: requestedIds.sort()
    }

  if (input.maxCandidates !== undefined && plan.candidateIds.length > input.maxCandidates) {
    throw new BulkJoinLimitExceededError(plan.candidateIds.length, input.maxCandidates)
  }

  return plan
}

export function buildBulkJoinWriteSet(
  candidateIds: UUID[],
  existingIds: UUID[]
): BulkJoinWriteSet {
  const candidates = distinctIds(candidateIds)
  const existing = new Set(existingIds)
  const alreadyJoinedIds = candidates.filter(id => existing.has(id))

  return {
    candidateIds: candidates,
    alreadyJoinedIds,
    toInsertIds: candidates.filter(id => !existing.has(id))
  }
}
