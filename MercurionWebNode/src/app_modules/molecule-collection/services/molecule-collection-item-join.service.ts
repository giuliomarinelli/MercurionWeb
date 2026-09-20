import { MoleculeCollectionItemJoin } from './../models/entities/molecule-collection-item-join.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, LessThanOrEqual, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { MoleculeCollectionService } from './molecule-collection.service';
import { MoleculeCollectionItemService } from './molecule-collection-item.service';
import { MoleculeCollection } from '../models/entities/molecule-collection.entity';
import { MoleculeCollectionItemEntity } from '../models/entities/molecule-collection-item.entity';
import { ChEMBLMoleculeItemEntity } from '../models/entities/chembl-molecule-item.entity';
import { MoleculeService } from 'src/app_modules/meilisearch/services/molecule.service';
import { BindManyCollectionsToMoleculeDTO } from '../models/dto/bind-many-collections-to-molecule.dto';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';
import { runInTransaction } from 'src/persistence/transaction-context';
import {
    buildBulkJoinWriteSet,
    planBulkJoinSelection
} from './bulk-join-planner';
import { MoleculeOwnershipPolicy } from './molecule-ownership.policy';

@Injectable()
export class MoleculeCollectionItemJoinService {

    static readonly MAX_SYNCHRONOUS_BULK_CANDIDATES = 500

    private readonly logger: LoggerContext

    constructor(
        @InjectRepository(MoleculeCollectionItemJoin)
        private readonly joinRepo: Repository<MoleculeCollectionItemJoin>,
        private readonly dataSource: DataSource,
        private readonly collectionService: MoleculeCollectionService,
        private readonly itemService: MoleculeCollectionItemService,
        private readonly moleculeService: MoleculeService,
        private readonly ownershipPolicy: MoleculeOwnershipPolicy,
        meiliLogger: LoggerPort
    ) {
        this.logger = meiliLogger.forContext(MoleculeCollectionItemJoinService.name)
    }

    // Metodo STANDARD (fuori da transaction esplicita)
    async add(userId: UUID, collectionId: UUID, itemId: UUID): Promise<MoleculeCollectionItemJoin> {
        return await runInTransaction(this.joinRepo.manager, async (_context, manager) => {
            return this.addMoleculeToCollectionWithManager(userId, collectionId, itemId, manager)
        })
    }

    // Metodo ATOMICO per usare il manager di una transaction già aperta
    async addMoleculeToCollectionWithManager(
        userId: UUID,
        collectionId: UUID,
        itemId: UUID,
        manager: EntityManager
    ): Promise<MoleculeCollectionItemJoin> {
        await this.ownershipPolicy.assertCollectionOwned(manager, userId, collectionId);
        await this.ownershipPolicy.assertItemOwned(manager, userId, itemId);

        let join = await manager.findOne(MoleculeCollectionItemJoin, {
            where: { collectionId, itemId, userId }
        })
        if (join) return join;
        join = manager.create(MoleculeCollectionItemJoin, { collectionId, itemId, userId });
        return await manager.save(MoleculeCollectionItemJoin, join)
    }

    async removeMoleculeFromCollection(userId: UUID, collectionId: UUID, itemId: UUID, deleteCollectionIfEmpty = false): Promise<boolean> {
        try {
            return await runInTransaction(this.joinRepo.manager, async (_context, manager) => {
                return this.removeMoleculeFromCollectionWithManager(userId, collectionId, itemId, deleteCollectionIfEmpty, manager);
            })
        } catch {
            return false
        }
    }

    async removeMoleculeFromCollectionWithManager(
        userId: UUID,
        collectionId: UUID,
        itemId: UUID,
        deleteCollectionIfEmpty = false,
        manager: EntityManager
    ): Promise<boolean> {
        const join = await manager.findOne(MoleculeCollectionItemJoin, {
            where: { collectionId, itemId, userId }
        });
        if (!join) {
            return false
        }
        await manager.delete(MoleculeCollectionItemJoin,
            {
                id: join.id
            })
        if (!deleteCollectionIfEmpty) {
            return true
        }
        const itemsPerCollectionCount = await manager.count(MoleculeCollectionItemJoin, {
            where: {
                collectionId, userId
            }
        })
        if (itemsPerCollectionCount === 0) {
            await manager.delete(MoleculeCollection, { id: collectionId, userId })
        }
        return true
    }

    async addManyMoleculesToCollection(
        userId: UUID,
        collectionId: UUID,
        itemIds: UUID[],
        selectAll: boolean,
        snapshotAt?: string
    ): Promise<UUID[]> {
        return runInTransaction(this.dataSource, async (_context, manager) =>
            this.addManyMoleculesToCollectionWithManager(userId, collectionId, itemIds, selectAll, manager, snapshotAt)
        );
    }

    /**
     * @returns itemId scartati perché la join (userId, collectionId, itemId) esisteva già
     */
    async addManyMoleculesToCollectionWithManager(
        userId: UUID,
        collectionId: UUID,
        itemIds: UUID[],
        selectAll: boolean,
        manager: EntityManager,
        snapshotAt?: string
    ): Promise<UUID[]> {

        await this.ownershipPolicy.assertCollectionOwned(manager, userId, collectionId);
        const selection = await this.planItemCandidates(manager, userId, itemIds, selectAll, snapshotAt);
        if (selection.candidateIds.length === 0) return [];

        const existingIds = await this.findExistingItemJoins(
            manager, userId, collectionId, selection.candidateIds
        );
        const writeSet = buildBulkJoinWriteSet(selection.candidateIds, existingIds);
        const { toInsertIds: toInsert } = writeSet;
        if (toInsert.length > 0) {
            await manager
                .createQueryBuilder()
                .insert()
                .into(MoleculeCollectionItemJoin)
                .values(toInsert.map(itemId => ({ id: uuidv7() as UUID, userId, collectionId, itemId })))
                .orIgnore() // richiede unique su (user_id, collection_id, item_id)
                .execute();
        }



        await this.collectionService.markAsTouchedWithManager(userId, collectionId, manager)

        await this.itemService.markManyAsTouchedWithManager(userId, toInsert, manager)

        return writeSet.alreadyJoinedIds;
    }

    async bindManyCollectionsToMolecule(userId: UUID, moleculeId: string, collectionIds: UUID[], selectAll: boolean, snapshotAt?: string): Promise<BindManyCollectionsToMoleculeDTO> {
        let preparedChemblName: string | undefined
        if (/^\d+$/.test(String(moleculeId))) {
            const chemblMolregno = Number(moleculeId)
            if (!await this.moleculeService.existsMoleculeByMolregno(chemblMolregno)) {
                return { ok: false, moleculeUUID: null }
            }
            const [chemblMol] = (await this.moleculeService.getPreviewsByMolregnos([String(chemblMolregno)]))
                .filter(res => !!res)
            if (!chemblMol) return { ok: false, moleculeUUID: null }
            preparedChemblName = chemblMol.preferredName
            if ((!preparedChemblName || !preparedChemblName.trim()) && Array.isArray(chemblMol.synonyms)) {
                preparedChemblName = chemblMol.synonyms.find(synonym => !!synonym?.trim())
            }
            preparedChemblName ||= `Lead ${chemblMolregno}`
        }
        return runInTransaction(this.dataSource, async (_context, manager) =>
            this.bindManyCollectionsToMoleculeWithManager(
                userId, moleculeId, collectionIds, selectAll, manager, preparedChemblName, snapshotAt
            )
        )
    }

    async bindManyCollectionsToMoleculeWithManager(
        userId: UUID,
        moleculeId: string,
        collectionIds: UUID[],
        selectAll: boolean,
        manager: EntityManager,
        preparedChemblName?: string,
        snapshotAt?: string
    ): Promise<BindManyCollectionsToMoleculeDTO> {

        const isMolregno = /^\d+$/.test(String(moleculeId))

        let moleculeUUID: UUID | null = null

        if (isMolregno) {
            const chemblMolregno = Number(moleculeId)
            if (!preparedChemblName) {
                return {
                    ok: false,
                    moleculeUUID
                }
            }
            const existsEntity = await manager.exists(ChEMBLMoleculeItemEntity, {
                where: {
                    userId,
                    chemblMolregno
                }
            })
            if (existsEntity) {
                const row = await manager.findOne(ChEMBLMoleculeItemEntity, {
                    where: {
                        userId,
                        chemblMolregno
                    },
                    select: {
                        id: true
                    }
                })
                moleculeId = row!.id
                moleculeUUID = moleculeId as UUID
            } else {
                const now = Date.now()
                const newEntity = manager.create(ChEMBLMoleculeItemEntity, {
                    id: uuidv7() as UUID,
                    userId,
                    type: 'chembl',
                    chemblMolregno,
                    name: preparedChemblName,
                    createdAt: now,
                    updatedAt: now,
                    touchedAt: now
                })
                const persisted = await manager.save(newEntity)
                moleculeId = persisted.id
                moleculeUUID = moleculeId as UUID
            }
        } else {
            if ((await this.ownershipPolicy.classifyItem(manager, userId, moleculeId as UUID)) !== 'owned') {
                return {
                    ok: false,
                    moleculeUUID
                }
            }
        }

        const selection = await this.planCollectionCandidates(manager, userId, collectionIds, selectAll, snapshotAt)
        if (selection.candidateIds.length === 0) {
            return {
                ok: false,
                moleculeUUID
            }
        }
        const existingIds = await this.findExistingCollectionJoins(
            manager, userId, moleculeId as UUID, selection.candidateIds
        )
        const writeSet = buildBulkJoinWriteSet(selection.candidateIds, existingIds)
        const { toInsertIds: toInsert } = writeSet
        if (toInsert.length > 0) {
            await manager
                .createQueryBuilder()
                .insert()
                .into(MoleculeCollectionItemJoin)
                .values(toInsert.map(collectionId => ({
                    id: uuidv7() as UUID,
                    collectionId,
                    userId,
                    itemId: moleculeId as UUID
                })))
                .orIgnore()
                .execute()
        }
        await this.itemService.markAsTouchedWithManager(userId, moleculeId as UUID, manager)
        await this.collectionService.markManyAsTouchedWithManager(userId, toInsert, manager)
        return {
            ok: true,
            moleculeUUID
        }
    }

    private async planItemCandidates(
        manager: EntityManager, userId: UUID, requestedIds: UUID[], selectAll: boolean, snapshotAt?: string
    ) {
        const classification = await this.ownershipPolicy.classifyItems(manager, userId, requestedIds)
        if (selectAll) {
            const boundary = this.parseSnapshotBoundary(snapshotAt)
            const rows = await manager.find(MoleculeCollectionItemEntity, {
                where: { userId, createdAt: LessThanOrEqual(boundary) },
                select: { id: true },
                order: { createdAt: 'ASC', id: 'ASC' },
                take: MoleculeCollectionItemJoinService.MAX_SYNCHRONOUS_BULK_CANDIDATES + 1
            })
            return planBulkJoinSelection({
                requestedIds,
                selectAll,
                maxCandidates: MoleculeCollectionItemJoinService.MAX_SYNCHRONOUS_BULK_CANDIDATES
            }, rows.map(row => row.id))
        }
        return planBulkJoinSelection({
            requestedIds,
            selectAll,
            maxCandidates: MoleculeCollectionItemJoinService.MAX_SYNCHRONOUS_BULK_CANDIDATES
        }, classification.ownedIds)
    }

    private async planCollectionCandidates(
        manager: EntityManager, userId: UUID, requestedIds: UUID[], selectAll: boolean, snapshotAt?: string
    ) {
        const classification = await this.ownershipPolicy.classifyCollections(manager, userId, requestedIds)
        if (selectAll) {
            const boundary = this.parseSnapshotBoundary(snapshotAt)
            const rows = await manager.find(MoleculeCollection, {
                where: { userId, createdAt: LessThanOrEqual(boundary) },
                select: { id: true },
                order: { createdAt: 'ASC', id: 'ASC' },
                take: MoleculeCollectionItemJoinService.MAX_SYNCHRONOUS_BULK_CANDIDATES + 1
            })
            return planBulkJoinSelection({
                requestedIds,
                selectAll,
                maxCandidates: MoleculeCollectionItemJoinService.MAX_SYNCHRONOUS_BULK_CANDIDATES
            }, rows.map(row => row.id))
        }
        return planBulkJoinSelection({
            requestedIds,
            selectAll,
            maxCandidates: MoleculeCollectionItemJoinService.MAX_SYNCHRONOUS_BULK_CANDIDATES
        }, classification.ownedIds)
    }

    private parseSnapshotBoundary(snapshotAt?: string): number {
        const boundary = Number(snapshotAt)
        if (!snapshotAt || !Number.isSafeInteger(boundary) || boundary <= 0) {
            throw new Error('BULK_SELECTION_SNAPSHOT_REQUIRED')
        }
        return boundary
    }

    private async findExistingItemJoins(
        manager: EntityManager, userId: UUID, collectionId: UUID, candidateIds: UUID[]
    ): Promise<UUID[]> {
        const rows = await manager.createQueryBuilder(MoleculeCollectionItemJoin, 'j')
            .select('j.itemId', 'itemId')
            .where('j.userId = :userId', { userId })
            .andWhere('j.collectionId = :collectionId', { collectionId })
            .andWhere('j.itemId = ANY(:ids)', { ids: candidateIds })
            .getRawMany<{ itemId: UUID }>()
        return rows.map(row => row.itemId)
    }

    private async findExistingCollectionJoins(
        manager: EntityManager, userId: UUID, itemId: UUID, candidateIds: UUID[]
    ): Promise<UUID[]> {
        const rows = await manager.createQueryBuilder(MoleculeCollectionItemJoin, 'j')
            .select('j.collectionId', 'collectionId')
            .where('j.userId = :userId', { userId })
            .andWhere('j.itemId = :itemId', { itemId })
            .andWhere('j.collectionId = ANY(:ids)', { ids: candidateIds })
            .getRawMany<{ collectionId: UUID }>()
        return rows.map(row => row.collectionId)
    }


}
