import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import {
  MoleculeItemsByCollectionArgs,
  MoleculeItemsByUserArgs
} from './molecule-collection-item-pagination.args'

describe('molecule collection item pagination args', () => {
  it.each([
    [MoleculeItemsByUserArgs, { page: 1, limit: 20, q: '', excludeJoinedToCollection: true, collectionId: 'collection-1' }],
    [MoleculeItemsByCollectionArgs, { page: 1, limit: 20, q: '', excluded: false, collectionId: 'collection-1' }]
  ])('accepts query-specific fields for %p', async (ArgsType, input) => {
    const args = plainToInstance(ArgsType, input)

    const errors = await validate(args, { whitelist: true, forbidNonWhitelisted: true })

    expect(errors).toEqual([])
  })
})
