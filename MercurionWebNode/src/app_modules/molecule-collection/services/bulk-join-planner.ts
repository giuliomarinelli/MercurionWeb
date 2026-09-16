import { UUID } from 'crypto'

export interface BulkJoinSelectionInput {
  requestedIds: UUID[]
  selectAll: boolean
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

export function distinctIds(ids: UUID[]): UUID[] {
  return Array.from(new Set(ids))
}

export function planBulkJoinSelection(
  input: BulkJoinSelectionInput,
  ownedIds: UUID[]
): BulkJoinSelectionPlan {
  const requestedIds = distinctIds(input.requestedIds)
  const owned = new Set(ownedIds)

  if (!input.selectAll) {
    return {
      candidateIds: requestedIds.filter(id => owned.has(id)),
      excludedIds: []
    }
  }

  const excludedIds = new Set(requestedIds)
  return {
    candidateIds: distinctIds(ownedIds).filter(id => !excludedIds.has(id)),
    excludedIds: requestedIds
  }
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
