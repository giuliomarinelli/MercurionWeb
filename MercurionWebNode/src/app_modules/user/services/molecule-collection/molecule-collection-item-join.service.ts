import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { MoleculeCollectionItemJoin } from '../../Models/entities/molecule-collection/molecule-collection-item-join.entity';


@Injectable()
export class MoleculeCollectionItemJoinService {

    constructor(
        @InjectRepository(MoleculeCollectionItemJoin)
        private readonly joinRepo: Repository<MoleculeCollectionItemJoin>,
    ) { }

    async add(userId: UUID, collectionId: UUID, itemId: UUID): Promise<MoleculeCollectionItemJoin> {
        return await this.joinRepo.manager.transaction(async manager => {
            let join = await manager.findOne(MoleculeCollectionItemJoin, {
                where: { collection: { id: collectionId, userId }, item: { id: itemId, userId }, userId }
            })

            if (join) return join

            // Creazione solo se NON esiste già
            join = this.joinRepo.create({
                collection: { id: collectionId, userId },
                item: { id: itemId, userId },
                userId
            })
            return await manager.save(join)
        })
    }


    async remove(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {
        try {
            await this.joinRepo.delete({ collectionId, itemId, userId })
            return true
        } catch {
            return false
        }
    }

}
