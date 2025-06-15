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
                where: { collectionId, itemId, userId }
            })
            if (join) return join

            // Se non esiste, la crei
            join = this.joinRepo.create({ collectionId, itemId, userId })
            return await manager.save(join)
        })
    }



    async remove(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {
        try {

            const join = await this.joinRepo.findOne({
                where: { collectionId, itemId, userId }
            })
            
            if (!join) return false 

            await this.joinRepo.delete({ id: join.id })
            return true

        } catch {
            return false
        }
    }

}
