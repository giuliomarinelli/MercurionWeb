import { ForbiddenException, Injectable } from '@nestjs/common'
import { UUID } from 'crypto'
import { EntityManager, EntityTarget, In } from 'typeorm'
import { MoleculeCollection } from '../models/entities/molecule-collection.entity'
import { MoleculeCollectionItemEntity } from '../models/entities/molecule-collection-item.entity'
import { MoleculeCollectionItemJoin } from '../models/entities/molecule-collection-item-join.entity'

export type MoleculeOwnedResource = 'collection' | 'item' | 'join'
export type MoleculeOwnershipState = 'owned' | 'missing' | 'foreign'

export interface MoleculeOwnershipClassification {
  requestedIds: UUID[]
  ownedIds: UUID[]
  missingIds: UUID[]
  foreignIds: UUID[]
}

/**
 * The only place where molecule-domain ownership is classified.
 *
 * The manager is deliberately supplied by callers so a command running in a
 * Unit of Work observes the same snapshot and transaction as its writes.
 */
@Injectable()
export class MoleculeOwnershipPolicy {
  async classifyCollection(
    manager: EntityManager,
    userId: UUID,
    id: UUID,
  ): Promise<MoleculeOwnershipState> {
    const result = await this.classifyCollections(manager, userId, [id])
    return result.ownedIds.length ? 'owned' : result.foreignIds.length ? 'foreign' : 'missing'
  }

  async classifyItem(
    manager: EntityManager,
    userId: UUID,
    id: UUID,
  ): Promise<MoleculeOwnershipState> {
    const result = await this.classifyItems(manager, userId, [id])
    return result.ownedIds.length ? 'owned' : result.foreignIds.length ? 'foreign' : 'missing'
  }

  async classifyCollections(
    manager: EntityManager,
    userId: UUID,
    requestedIds: UUID[],
  ): Promise<MoleculeOwnershipClassification> {
    return this.classify(manager, MoleculeCollection, userId, requestedIds)
  }

  async classifyItems(
    manager: EntityManager,
    userId: UUID,
    requestedIds: UUID[],
  ): Promise<MoleculeOwnershipClassification> {
    return this.classify(manager, MoleculeCollectionItemEntity, userId, requestedIds)
  }

  async assertCollectionOwned(manager: EntityManager, userId: UUID, id: UUID): Promise<void> {
    if ((await this.classifyCollections(manager, userId, [id])).ownedIds.length === 0) {
      throw new ForbiddenException('CollectionAccessForbidden')
    }
  }

  async assertItemOwned(manager: EntityManager, userId: UUID, id: UUID): Promise<void> {
    if ((await this.classifyItems(manager, userId, [id])).ownedIds.length === 0) {
      throw new ForbiddenException('MoleculeAccessForbidden')
    }
  }

  async assertAllItemsOwned(
    manager: EntityManager,
    userId: UUID,
    ids: UUID[],
  ): Promise<MoleculeOwnershipClassification> {
    const result = await this.classifyItems(manager, userId, ids)
    if (result.ownedIds.length !== result.requestedIds.length) {
      throw new ForbiddenException('MoleculeAccessForbidden')
    }
    return result
  }

  async classifyJoins(
    manager: EntityManager,
    userId: UUID,
    collectionId: UUID,
    itemIds: UUID[],
  ): Promise<MoleculeOwnershipClassification> {
    const requestedIds = Array.from(new Set(itemIds))
    if (requestedIds.length === 0) {
      return { requestedIds, ownedIds: [], missingIds: [], foreignIds: [] }
    }
    const rows = await manager.find(MoleculeCollectionItemJoin, {
      where: { collectionId, itemId: In(requestedIds) },
      select: { itemId: true, userId: true },
    })
    const owned = new Set(rows.filter(row => row.userId === userId).map(row => row.itemId))
    const present = new Set(rows.map(row => row.itemId))
    return {
      requestedIds,
      ownedIds: requestedIds.filter(id => owned.has(id)),
      missingIds: requestedIds.filter(id => !present.has(id)),
      foreignIds: requestedIds.filter(id => present.has(id) && !owned.has(id)),
    }
  }

  private async classify<T extends { id: UUID; userId: UUID }>(
    manager: EntityManager,
    entity: EntityTarget<T>,
    userId: UUID,
    ids: UUID[],
  ): Promise<MoleculeOwnershipClassification> {
    const requestedIds = Array.from(new Set(ids))
    if (requestedIds.length === 0) {
      return { requestedIds, ownedIds: [], missingIds: [], foreignIds: [] }
    }
    const rows = await manager.find(entity, {
      where: { id: In(requestedIds) },
      select: { id: true, userId: true },
    } as never)
    const byId = new Map(rows.map(row => [row.id, row.userId]))
    return {
      requestedIds,
      ownedIds: requestedIds.filter(id => byId.get(id) === userId),
      missingIds: requestedIds.filter(id => !byId.has(id)),
      foreignIds: requestedIds.filter(id => byId.has(id) && byId.get(id) !== userId),
    }
  }
}
