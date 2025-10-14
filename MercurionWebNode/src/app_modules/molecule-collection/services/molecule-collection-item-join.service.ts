import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { MoleculeCollectionItemJoin } from '../Models/entities/molecule-collection-item-join.entity';


@Injectable()
export class MoleculeCollectionItemJoinService {

    constructor(
        @InjectRepository(MoleculeCollectionItemJoin)
        private readonly joinRepo: Repository<MoleculeCollectionItemJoin>,
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
}


