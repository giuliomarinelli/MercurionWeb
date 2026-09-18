import type { UUID } from 'crypto'
import type { EntityManager } from 'typeorm'

import { UnitOfWork } from 'src/persistence/transaction-context'
import { ChEMBLMoleculeItemEntity } from '../models/entities/chembl-molecule-item.entity'
import { MoleculeCollection } from '../models/entities/molecule-collection.entity'
import { MoleculeCollectionItemJoin } from '../models/entities/molecule-collection-item-join.entity'
import { InitialWorkspaceService, STARTER_WORKSPACE } from './initial-workspace.service'

describe('InitialWorkspaceService', () => {
  const userId = '00000000-0000-4000-8000-000000000001' as UUID

  function createManager() {
    const collections: MoleculeCollection[] = []
    const items: ChEMBLMoleculeItemEntity[] = []
    const joins: MoleculeCollectionItemJoin[] = []
    const manager = {
      create: jest.fn((_entity, value) => value),
      findOne: jest.fn(async (entity, options) => {
        if (entity === MoleculeCollection) {
          return collections.find(collection =>
            collection.userId === options.where.userId &&
            collection.systemKey === options.where.systemKey
          ) ?? null
        }
        return null
      }),
      find: jest.fn(async (entity, options) => {
        if (entity === ChEMBLMoleculeItemEntity) {
          const requested = options.where.systemKey?._value as string[] | undefined
          const requestedMolregnos = options.where.chemblMolregno?._value as number[] | undefined
          return items.filter(item =>
            item.userId === options.where.userId &&
            (requested ? item.systemKey !== null && requested.includes(item.systemKey) : requestedMolregnos?.includes(Number(item.chemblMolregno)))
          )
        }
        if (entity === MoleculeCollection) {
          return collections.filter(collection =>
            collection.userId === options.where.userId && collection.name === options.where.name
          )
        }
        return joins.filter(join =>
          join.userId === options.where.userId && join.collectionId === options.where.collectionId
        )
      }),
      save: jest.fn(async (value) => {
        const values = Array.isArray(value) ? value : [value]
        for (const entity of values) {
          if (entity instanceof ChEMBLMoleculeItemEntity || 'chemblMolregno' in entity) {
            if (!items.includes(entity)) items.push(entity)
          } else if (entity instanceof MoleculeCollection || 'name' in entity) {
            if (!collections.includes(entity)) collections.push(entity)
          } else if ('collectionId' in entity) {
            if (!joins.includes(entity)) joins.push(entity)
          }
        }
        return value
      })
    } as unknown as EntityManager
    return { manager, collections, items, joins }
  }

  function unitOfWorkFor(manager: EntityManager) {
    return new UnitOfWork({
      transaction: (work: (manager: EntityManager) => Promise<unknown>) => work(manager)
    } as never)
  }

  it('uses one canonical specification and converges on repeated calls', async () => {
    const state = createManager()
    const service = new InitialWorkspaceService()

    await unitOfWorkFor(state.manager).run(context => service.initializeForUser(userId, context))
    await unitOfWorkFor(state.manager).run(context => service.initializeForUser(userId, context))

    expect(state.collections).toHaveLength(1)
    expect(state.items).toHaveLength(STARTER_WORKSPACE.molecules.length)
    expect(state.joins).toHaveLength(STARTER_WORKSPACE.molecules.length)
    expect(state.collections[0].systemKey).toBe(STARTER_WORKSPACE.collection.key)
    expect(state.items.map(item => item.systemKey)).toEqual(
      STARTER_WORKSPACE.molecules.map(molecule => molecule.key)
    )
  })

  it('propagates a persistence failure so the caller transaction can roll back', async () => {
    const state = createManager()
    state.manager.save = jest.fn().mockRejectedValue(new Error('database failure'))
    const service = new InitialWorkspaceService()

    await expect(
      unitOfWorkFor(state.manager).run(context => service.initializeForUser(userId, context))
    ).rejects.toThrow('database failure')
  })
})
