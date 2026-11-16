import { UUID } from 'crypto'
import { DataSource, EntityManager } from 'typeorm'
import { RDKitService } from 'src/app_modules/mercurion-ai/services/rd-kit.service'
import { CustomMoleculeItemEntity } from '../models/entities/custom-molecule-item.entity'
import { CustomMoleculeResolutionService } from './custom-molecule-resolution.service'

describe('CustomMoleculeResolutionService', () => {
  const userId = '019a0dd3-19fa-7c1f-b128-7e2b0cdab73c' as UUID
  const canonicalSmiles = 'CCO'
  const input = {
    canonicalSmiles,
    name: 'Ethanol',
    label: 'My label',
    notes: 'Personal notes'
  }

  function createTestContext() {
    const query = jest.fn().mockResolvedValue([])
    const findOne = jest.fn()
    const create = jest.fn((_: unknown, value: unknown) => value)
    const execute = jest.fn().mockResolvedValue({})
    const queryBuilder = {
      insert: jest.fn(),
      into: jest.fn(),
      values: jest.fn(),
      orIgnore: jest.fn(),
      execute
    }
    for (const method of ['insert', 'into', 'values', 'orIgnore'] as const) {
      queryBuilder[method].mockReturnValue(queryBuilder)
    }

    const manager = {
      query,
      findOne,
      create,
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder)
    } as unknown as EntityManager

    const dataSource = { transaction: jest.fn() } as unknown as DataSource
    const rdKit = { toCanonicalSmiles: jest.fn().mockResolvedValue(canonicalSmiles) }
    const service = new CustomMoleculeResolutionService(
      dataSource,
      rdKit as unknown as RDKitService
    )
    return { service, manager, query, findOne, create, queryBuilder, execute, rdKit }
  }

  it('reuses an owned matching custom molecule without overwriting its metadata', async () => {
    const { service, manager, findOne, create, queryBuilder, query } = createTestContext()
    const existing = {
      id: '019a0dd3-19fa-7c1f-b128-7e2b0cdab73d',
      userId,
      canonicalSmiles,
      name: 'Previous name',
      label: 'Do not overwrite'
    }
    findOne.mockResolvedValue(existing)

    const result = await service.resolveCanonicalWithManager(
      userId, canonicalSmiles, input, manager
    )

    expect(result).toBe(existing)
    expect(result.name).toBe('Previous name')
    expect(create).not.toHaveBeenCalled()
    expect(queryBuilder.insert).not.toHaveBeenCalled()
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('pg_advisory_xact_lock'),
      [userId + ':' + canonicalSmiles]
    )
    expect(findOne).toHaveBeenCalledWith(CustomMoleculeItemEntity, {
      where: { userId, type: 'custom', canonicalSmiles }
    })
  })

  it('inserts once and reloads the resulting molecule', async () => {
    const { service, manager, findOne, create, queryBuilder, execute } = createTestContext()
    const persisted = { id: '019a0dd3-19fa-7c1f-b128-7e2b0cdab73e', userId, canonicalSmiles }
    findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(persisted)

    const result = await service.resolveCanonicalWithManager(
      userId, canonicalSmiles, input, manager
    )

    expect(result).toBe(persisted)
    expect(create).toHaveBeenCalledTimes(1)
    expect(queryBuilder.into).toHaveBeenCalledWith(CustomMoleculeItemEntity)
    expect(queryBuilder.orIgnore).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(findOne).toHaveBeenCalledTimes(2)
  })

  it('rejects an empty molecule instead of creating a corrupt custom identity', async () => {
    const { service, manager, query, findOne } = createTestContext()
    await expect(service.resolveCanonicalWithManager(userId, '   ', input, manager))
      .rejects.toThrow('MOLECULE_STRUCTURE_INVALID')
    expect(query).not.toHaveBeenCalled()
    expect(findOne).not.toHaveBeenCalled()
  })

  it('canonicalizes the molecule before resolving its persisted identity', async () => {
    const { service, rdKit } = createTestContext()
    await expect(service.canonicalize('OCC', 'token')).resolves.toBe(canonicalSmiles)
    expect(rdKit.toCanonicalSmiles).toHaveBeenCalledWith({ smiles: 'OCC', accessToken: 'token' })
  })
})
