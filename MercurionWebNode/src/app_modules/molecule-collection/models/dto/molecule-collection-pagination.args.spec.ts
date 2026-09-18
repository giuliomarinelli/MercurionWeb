import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { MoleculeCollectionPaginationArgs } from './molecule-collection-pagination.args'

describe('MoleculeCollectionPaginationArgs', () => {
  it('accepts the collection-specific filters with pagination', async () => {
    const args = plainToInstance(MoleculeCollectionPaginationArgs, {
      page: 1,
      limit: 20,
      q: '',
      excludeJoinedToMolecule: true,
      moleculeId: 'collection-target'
    })

    const errors = await validate(args, { whitelist: true, forbidNonWhitelisted: true })

    expect(errors).toEqual([])
  })
})
