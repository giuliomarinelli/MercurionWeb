import { errorMessage } from 'src/utils/errors/error-message'
import { MoleculeCollectionItemJoin } from './../models/entities/molecule-collection-item-join.entity';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
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




@Injectable()
export class MoleculeCollectionItemJoinService {

    private readonly logger: LoggerContext

    constructor(
        @InjectRepository(MoleculeCollectionItemJoin)
        private readonly joinRepo: Repository<MoleculeCollectionItemJoin>,
        private readonly dataSource: DataSource,
        private readonly collectionService: MoleculeCollectionService,
        private readonly itemService: MoleculeCollectionItemService,
        private readonly moleculeService: MoleculeService,
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
        await this.assertCollectionOwnership(manager, userId, collectionId);
        await this.assertItemOwnership(manager, userId, itemId);

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
        selectAll: boolean
    ): Promise<UUID[]> {
        return runInTransaction(this.dataSource, async (_context, manager) =>
            this.addManyMoleculesToCollectionWithManager(userId, collectionId, itemIds, selectAll, manager)
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
        manager: EntityManager
    ): Promise<UUID[]> {

        await this.assertCollectionOwnership(manager, userId, collectionId);
        const distinct = Array.from(new Set(itemIds));

        // 1) Costruisci i candidati
        let candidateIds: UUID[] = [];
        if (!selectAll) {
            candidateIds = await this.filterOwnedItemIds(manager, userId, distinct);
        } else {

            const qbAll = manager
                .createQueryBuilder(MoleculeCollectionItemEntity, 'it')
                .select('it.id', 'id')
                .where('it.userId = :userId', { userId });

            if (distinct.length > 0) {
                qbAll.andWhere('NOT (it.id = ANY(:excluded))', { excluded: distinct });
            }

            const rows = await qbAll.getRawMany<{ id: UUID }>();
            candidateIds = rows.map(r => r.id);
        }

        if (candidateIds.length === 0) return [];

        // 2) Trova quelli già joinati (da scartare)
        const qbExisting = manager
            .createQueryBuilder(MoleculeCollectionItemJoin, 'j')
            .select('j.itemId', 'itemId')
            .where('j.userId = :userId', { userId })
            .andWhere('j.collectionId = :collectionId', { collectionId });

        // Postgres-ottimizzato:
        qbExisting.andWhere('j.itemId = ANY(:ids)', { ids: candidateIds });

        const alreadyRows = await qbExisting.getRawMany<{ itemId: UUID }>();
        const alreadySet = new Set(alreadyRows.map(r => r.itemId));

        const toInsert = candidateIds.filter(id => !alreadySet.has(id));
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

        for (const itemId of toInsert) {
            await this.itemService.markAsTouchedWithManager(userId, itemId, manager)
        }

        // 3) Ritorna gli scartati
        return Array.from(alreadySet);
    }

    async bindManyCollectionsToMolecule(userId: UUID, moleculeId: string, collectionIds: UUID[], selectAll: boolean): Promise<BindManyCollectionsToMoleculeDTO> {
        try {
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
            return await runInTransaction(this.dataSource, async (_context, manager) => {
                return this.bindManyCollectionsToMoleculeWithManager(
                    userId,
                    moleculeId,
                    collectionIds,
                    selectAll,
                    manager,
                    preparedChemblName
                )
            })
        } catch (e) {
            this.logger.warn(`MoleculeCollectionItemJoinService > bindManyCollectionsToMolecule: Error => ${errorMessage(e)}`)
            return {
                ok: false,
                moleculeUUID: null
            }
        }
    }

    async bindManyCollectionsToMoleculeWithManager(
        userId: UUID,
        moleculeId: string,
        collectionIds: UUID[],
        selectAll: boolean,
        manager: EntityManager,
        preparedChemblName?: string
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
            const ownsMolecule = await manager.exists(MoleculeCollectionItemEntity, {
                where: { userId, id: moleculeId as UUID }
            })
            if (!ownsMolecule) {
                return {
                    ok: false,
                    moleculeUUID
                }
            }
        }

        const distinct = Array.from(new Set(collectionIds))
        let candidateIds: UUID[] = []

        if (!selectAll) {
            candidateIds = await this.filterOwnedCollectionIds(manager, userId, distinct)
        } else {
            const qbAll = manager
                .createQueryBuilder(MoleculeCollection, 'c')
                .select('c.id', 'id')
                .where('c.userId = :userId', { userId });

            if (distinct.length > 0) {
                qbAll.andWhere('NOT (c.id = ANY(:excluded))', { excluded: distinct })
            }
            const rows = await qbAll.getRawMany<Pick<MoleculeCollection, 'id'>>()
            candidateIds = rows.map(r => r.id)
        }
        if (candidateIds.length === 0) {
            return {
                ok: false,
                moleculeUUID
            }
        }
        const qbExisting = manager
            .createQueryBuilder(MoleculeCollectionItemJoin, 'j')
            .select(['j.collectionId'])
            .where('j.userId = :userId', { userId })
            .andWhere('j.itemId = :itemId', { itemId: moleculeId })
            .andWhere('j.collectionId = ANY(:ids)', { ids: candidateIds })

        const alreadyRows = await qbExisting.getRawMany<Pick<MoleculeCollectionItemJoin, 'collectionId'>>()
        const alreadySet = new Set(alreadyRows.map(r => r.collectionId))
        const toInsert = candidateIds.filter(id => !alreadySet.has(id))
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
        for (const collectionId of toInsert) {
            await this.collectionService.markAsTouchedWithManager(userId, collectionId, manager)
        }
        return {
            ok: true,
            moleculeUUID
        }
    }

    private async assertCollectionOwnership(manager: EntityManager, userId: UUID, collectionId: UUID): Promise<void> {
        const owns = await manager.exists(MoleculeCollection, { where: { id: collectionId, userId } })
        if (!owns) {
            throw new ForbiddenException('CollectionAccessForbidden')
        }
    }

    private async assertItemOwnership(manager: EntityManager, userId: UUID, itemId: UUID): Promise<void> {
        const owns = await manager.exists(MoleculeCollectionItemEntity, { where: { id: itemId, userId } })
        if (!owns) {
            throw new ForbiddenException('MoleculeAccessForbidden')
        }
    }

    private async filterOwnedItemIds(manager: EntityManager, userId: UUID, ids: UUID[]): Promise<UUID[]> {
        if (ids.length === 0) {
            return []
        }
        const rows = await manager.find(MoleculeCollectionItemEntity, {
            where: { userId, id: In(ids) },
            select: { id: true }
        })
        return rows.map(r => r.id)
    }

    private async filterOwnedCollectionIds(manager: EntityManager, userId: UUID, ids: UUID[]): Promise<UUID[]> {
        if (ids.length === 0) {
            return []
        }
        const rows = await manager.find(MoleculeCollection, {
            where: { userId, id: In(ids) },
            select: { id: true }
        })
        return rows.map(r => r.id)
    }


}
