import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { MoleculeCollectionItemJoin } from '../Models/entities/molecule-collection-item-join.entity';


@Injectable()
export class MoleculeCollectionItemJoinService {

    constructor(
        @InjectRepository(MoleculeCollectionItemJoin)
        private readonly joinRepo: Repository<MoleculeCollectionItemJoin>,
        private readonly dataSource: DataSource
    ) { }

    // Metodo STANDARD (fuori da transaction esplicita)
    async add(userId: UUID, collectionId: UUID, itemId: UUID): Promise<MoleculeCollectionItemJoin> {
        return await this.joinRepo.manager.transaction(async manager => {
            return this.addWithManager(userId, collectionId, itemId, manager);
        })
    }

    // Metodo ATOMICO per usare il manager di una transaction già aperta
    async addWithManager(
        userId: UUID,
        collectionId: UUID,
        itemId: UUID,
        manager: EntityManager
    ): Promise<MoleculeCollectionItemJoin> {
        let join = await manager.findOne(MoleculeCollectionItemJoin, {
            where: { collectionId, itemId, userId }
        })
        if (join) return join;
        join = manager.create(MoleculeCollectionItemJoin, { collectionId, itemId, userId });
        return await manager.save(MoleculeCollectionItemJoin, join)
    }

    async remove(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {
        return await this.joinRepo.manager.transaction(async manager => {
            return this.removeWithManager(userId, collectionId, itemId, manager);
        })
    }

    async removeWithManager(
        userId: UUID,
        collectionId: UUID,
        itemId: UUID,
        manager: EntityManager
    ): Promise<boolean> {
        const join = await manager.findOne(MoleculeCollectionItemJoin, {
            where: { collectionId, itemId, userId }
        });
        if (!join) return false
        await manager.delete(MoleculeCollectionItemJoin, { id: join.id })
        return true
    }

    async addMany(
        userId: UUID,
        collectionId: UUID,
        itemIds: UUID[],
        selectAll: boolean
    ): Promise<UUID[]> {
        return this.dataSource.manager.transaction(manager =>
            this.addManyWithManager(userId, collectionId, itemIds, selectAll, manager)
        );
    }

    /**
     * @returns itemId scartati perché la join (userId, collectionId, itemId) esisteva già
     */
    async addManyWithManager(
        userId: UUID,
        collectionId: UUID,
        itemIds: UUID[],
        selectAll: boolean,
        manager: EntityManager
    ): Promise<UUID[]> {
        
        const distinct = Array.from(new Set(itemIds));

        // 1) Costruisci i candidati
        let candidateIds: UUID[];
        if (!selectAll) {
            candidateIds = distinct;
        } else {
            // Sostituisci con la tua sorgente reale (es. Molecule o MoleculeCollectionItemEntity)
            const qbAll = manager
                // .createQueryBuilder(Molecule, 'it')
                .createQueryBuilder('ItemsEntity', 'it')
                .select('it.id', 'id');

            if (distinct.length > 0) {
                // Postgres-ottimizzato
                qbAll.where('NOT (it.id = ANY(:excluded))', { excluded: distinct });

                // Se preferisci la compatibilità universale:
                // qbAll.where('it.id NOT IN (:...excluded)', { excluded: distinct });
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

        // Fallback cross-db:
        // qbExisting.andWhere('j.itemId IN (:...ids)', { ids: candidateIds });

        const alreadyRows = await qbExisting.getRawMany<{ itemId: UUID }>();
        const alreadySet = new Set(alreadyRows.map(r => r.itemId));

        const toInsert = candidateIds.filter(id => !alreadySet.has(id));
        if (toInsert.length > 0) {
            await manager
                .createQueryBuilder()
                .insert()
                .into(MoleculeCollectionItemJoin)
                .values(toInsert.map(itemId => ({ userId, collectionId, itemId })))
                .orIgnore() // richiede unique su (user_id, collection_id, item_id)
                .execute();
        }

        // 3) Ritorna gli scartati
        return Array.from(alreadySet);
    }
}