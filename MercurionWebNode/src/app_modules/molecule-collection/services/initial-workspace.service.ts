import { Injectable } from '@nestjs/common'
import { uuidv7 } from '@kripod/uuidv7'
import type { UUID } from 'crypto'
import { In } from 'typeorm'

import { transactionManager, type TransactionContext } from 'src/persistence/transaction-context'
import { ChEMBLMoleculeItemEntity } from '../models/entities/chembl-molecule-item.entity'
import { MoleculeCollection } from '../models/entities/molecule-collection.entity'
import { MoleculeCollectionItemJoin } from '../models/entities/molecule-collection-item-join.entity'

export const STARTER_WORKSPACE = {
  collection: {
    key: 'mercurion:starter-workspace',
    name: 'La mia prima collezione'
  },
  molecules: [
    { key: 'mercurion:starter-molecule:1280', chemblMolregno: 1280, name: 'ASPIRINA', nameEn: 'ASPIRIN', label: 'Acido acetilsalicilico', notes: 'La mia prima molecola su Mercurion' },
    { key: 'mercurion:starter-molecule:11674', chemblMolregno: 11674, name: 'IBUPROFENE', nameEn: 'IBUPROFEN', label: 'Antinfiammatorio non steroideo derivato dell\'acido arilpropionico', notes: 'La mia seconda molecola su Mercurion' },
    { key: 'mercurion:starter-molecule:5080', chemblMolregno: 5080, name: 'KETOROLAC', nameEn: 'KETOROLAC', label: null, notes: 'La mia terza molecola su Mercurion' },
    { key: 'mercurion:starter-molecule:173', chemblMolregno: 173, name: 'INDOMETACINA', nameEn: 'INDOMETHACIN', label: 'Indometacina', notes: 'Gastrotossica, nefrotossica' },
    { key: 'mercurion:starter-molecule:16591', chemblMolregno: 16591, name: 'KETOPROFENE', nameEn: 'KETOPROFEN', label: null, notes: 'Potente antinfiammatorio, buon analgesico' }
  ]
} as const

export type StarterWorkspaceSpecification = typeof STARTER_WORKSPACE

@Injectable()
export class InitialWorkspaceService {
  async initializeForUser(userId: UUID, context: TransactionContext): Promise<void> {
    const manager = transactionManager(context)
    const now = Date.now()
    let collection = await manager.findOne(MoleculeCollection, {
      where: { userId, systemKey: STARTER_WORKSPACE.collection.key }
    })

    const items = await manager.find(ChEMBLMoleculeItemEntity, {
      where: { userId, systemKey: In(STARTER_WORKSPACE.molecules.map(molecule => molecule.key)) }
    })
    const itemsByKey = new Map(items.map(item => [item.systemKey, item]))

    if (!collection || items.length !== STARTER_WORKSPACE.molecules.length) {
      await this.adoptLegacyWorkspace(userId, manager, collection, itemsByKey)
      collection = collection ?? await manager.findOne(MoleculeCollection, {
        where: { userId, systemKey: STARTER_WORKSPACE.collection.key }
      })
    }

    if (!collection) {
      collection = await manager.save(manager.create(MoleculeCollection, {
        id: uuidv7() as UUID,
        name: STARTER_WORKSPACE.collection.name,
        systemKey: STARTER_WORKSPACE.collection.key,
        createdAt: now,
        updatedAt: now,
        touchedAt: now,
        userId
      }))
    }

    const persistedItems = []
    for (const [index, specification] of STARTER_WORKSPACE.molecules.entries()) {
      let item = itemsByKey.get(specification.key)
      if (!item) {
        item = await manager.save(manager.create(ChEMBLMoleculeItemEntity, {
          id: uuidv7() as UUID,
          chemblMolregno: specification.chemblMolregno,
          name: specification.name,
          nameEn: specification.nameEn,
          userId,
          systemKey: specification.key,
          label: specification.label,
          notes: specification.notes,
          type: 'chembl',
          createdAt: now,
          updatedAt: now,
          touchedAt: now - index
        }))
      }
      persistedItems.push(item)
    }

    const existingJoins = await manager.find(MoleculeCollectionItemJoin, {
      where: { userId, collectionId: collection.id }
    })
    const existingItemIds = new Set(existingJoins.map(join => String(join.itemId)))
    const missingJoins = persistedItems
      .filter(item => !existingItemIds.has(String(item.id)))
      .map(item => manager.create(MoleculeCollectionItemJoin, {
        id: uuidv7() as UUID,
        userId,
        collectionId: collection!.id,
        itemId: item.id
      }))
    if (missingJoins.length > 0) await manager.save(missingJoins)
  }

  /** Compatibility adoption for rows written before stable keys existed. */
  private async adoptLegacyWorkspace(
    userId: UUID,
    manager: ReturnType<typeof transactionManager>,
    currentCollection: MoleculeCollection | null,
    itemsByKey: Map<string | null, ChEMBLMoleculeItemEntity>
  ): Promise<void> {
    if (itemsByKey.size === STARTER_WORKSPACE.molecules.length) return

    const legacyItems = await manager.find(ChEMBLMoleculeItemEntity, {
      where: {
        userId,
        chemblMolregno: In(STARTER_WORKSPACE.molecules.map(molecule => molecule.chemblMolregno))
      }
    })
    const itemByMolregno = new Map(legacyItems.map(item => [Number(item.chemblMolregno), item]))
    if (itemByMolregno.size !== STARTER_WORKSPACE.molecules.length) return

    const collections = currentCollection
      ? [currentCollection]
      : await manager.find(MoleculeCollection, {
        where: { userId, name: STARTER_WORKSPACE.collection.name }
      })
    for (const candidate of collections) {
      const joins = await manager.find(MoleculeCollectionItemJoin, {
        where: { userId, collectionId: candidate.id }
      })
      const joinedIds = new Set(joins.map(join => String(join.itemId)))
      const expectedIds = new Set(STARTER_WORKSPACE.molecules.map(molecule => String(itemByMolregno.get(molecule.chemblMolregno)!.id)))
      if (joinedIds.size !== expectedIds.size || [...expectedIds].some(id => !joinedIds.has(id))) continue

      candidate.systemKey = STARTER_WORKSPACE.collection.key
      await manager.save(candidate)
      for (const specification of STARTER_WORKSPACE.molecules) {
        const item = itemByMolregno.get(specification.chemblMolregno)!
        item.systemKey = specification.key
        itemsByKey.set(specification.key, item)
      }
      await manager.save([...itemsByKey.values()])
      return
    }
  }

  async createForUser(userId: UUID, context: TransactionContext): Promise<void> {
    return this.initializeForUser(userId, context)
  }
}
