import { UUID } from 'crypto'
import {
  buildBulkJoinWriteSet,
  planBulkJoinSelection
} from './bulk-join-planner'

const id = (value: string): UUID => value as UUID

describe('bulk join planner', () => {
  it('plans explicit owned candidates and removes duplicate requests', () => {
    expect(planBulkJoinSelection({
      requestedIds: [id('a'), id('a'), id('b')],
      selectAll: false
    }, [id('a'), id('c')])).toEqual({
      candidateIds: [id('a')],
      excludedIds: []
    })
  })

  it('plans select-all candidates while keeping exclusions explicit', () => {
    expect(planBulkJoinSelection({
      requestedIds: [id('b'), id('b')],
      selectAll: true
    }, [id('a'), id('b'), id('c')])).toEqual({
      candidateIds: [id('a'), id('c')],
      excludedIds: [id('b')]
    })
  })

  it('computes skipped and insert sets deterministically', () => {
    expect(buildBulkJoinWriteSet(
      [id('a'), id('b'), id('a'), id('c')],
      [id('b'), id('b')]
    )).toEqual({
      candidateIds: [id('a'), id('b'), id('c')],
      alreadyJoinedIds: [id('b')],
      toInsertIds: [id('a'), id('c')]
    })
  })
})
