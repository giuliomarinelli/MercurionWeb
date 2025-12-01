import { MoleculeCollectionItemJoin } from './../Models/entities/molecule-collection-item-join.entity';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { MoleculeCollectionService } from './molecule-collection.service';
import { MoleculeCollectionItemService } from './molecule-collection-item.service';
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity';
import { MoleculeCollectionItemEntity } from '../Models/entities/molecule-collection-item.entity';
import { ChEMBLMoleculeItemEntity } from '../Models/entities/chembl-molecule-item.entity';
import { MoleculeService } from 'src/app_modules/meilisearch/services/molecule.service';
import { BindManyCollectionsToMoleculeDTO } from '../Models/DTO/bind-many-collections-to-molecule.dto';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';




@Injectable()
export class MoleculeCollectionItemJoinService {

    private readonly logger: MeiliContextLogger

    constructor(
        @InjectRepository(MoleculeCollectionItemJoin)
        private readonly joinRepo: Repository<MoleculeCollectionItemJoin>,
        private readonly dataSource: DataSource,
        private readonly collectionService: MoleculeCollectionService,
        private readonly itemService: MoleculeCollectionItemService,
        private readonly moleculeService: MoleculeService,
        meiliLogger: MeiliLoggerService
    ) {
        this.logger = meiliLogger.forContext(MoleculeCollectionItemJoinService.name)
    }

    // Metodo STANDARD (fuori da transaction esplicita)
    async add(userId: UUID, collectionId: UUID, itemId: UUID): Promise<MoleculeCollectionItemJoin> {
        return await this.joinRepo.manager.transaction(async manager => {
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
            return await this.joinRepo.manager.transaction(async manager => {
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
        return this.dataSource.manager.transaction(manager =>
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
            return await this.dataSource.manager.transaction(async (manager) => {
                return this.bindManyCollectionsToMoleculeWithManager(userId, moleculeId, collectionIds, selectAll, manager)
            })
        } catch (e) {
            this.logger.warn(`MoleculeCollectionItemJoinService > bindManyCollectionsToMolecule: Error => ${e.message || e}`)
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
        manager: EntityManager
    ): Promise<BindManyCollectionsToMoleculeDTO> {

        const isMolregno = /^\d+$/.test(String(moleculeId))

        let moleculeUUID: UUID | null = null

        if (isMolregno) {
            const chemblMolregno = Number(moleculeId)
            const existsChemblMolecule = await this.moleculeService.existsMoleculeByMolregno(chemblMolregno)
            if (!existsChemblMolecule) {
                return {
                    ok: false,
                    moleculeUUID
                }
            }
            const [chemblMol] = (await this.moleculeService.getPreviewsByMolregnos([String(chemblMolregno)])).filter(res => !!res)
            let name = chemblMol.preferredName
            if ((!name || !name.trim()) && !!chemblMol.synonyms && Array.isArray(chemblMol.synonyms) && chemblMol.synonyms.length > 0) {
                for (const syn of chemblMol.synonyms) {
                    if (!syn || !syn.trim()) {
                        continue
                    }
                    name = syn
                    break
                }
            }
            if (!name) {
                name = `Lead ${chemblMolregno}`
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
                    name,
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
            candidateIds = rows.map(r => r.id as UUID)
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
            await this.collectionService.markAsTouchedWithManager(userId, collectionId as UUID, manager)
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
