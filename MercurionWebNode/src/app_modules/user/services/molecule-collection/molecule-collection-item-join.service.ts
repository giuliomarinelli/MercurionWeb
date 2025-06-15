import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { MoleculeCollectionItemJoin } from '../../Models/entities/molecule-collection/molecule-collection-item-join.entity';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class MoleculeCollectionItemJoinService {

    constructor(
        @InjectRepository(MoleculeCollectionItemJoin)
        private readonly joinRepo: Repository<MoleculeCollectionItemJoin>,
    ) { }

    async add(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {

        await this.joinRepo.manager.transaction(async manager => {
            const join = this.joinRepo.create({
                collection: { id: collectionId, userId },
                item: { id: itemId, userId },
                userId
            })
            const { id } = await manager.save(join)
            const joined = await manager.createQueryBuilder(MoleculeCollectionItemJoin, 'join')
                .leftJoinAndSelect('join.collection', 'collection')
                .leftJoinAndSelect('join.item', 'item')
                .where('join.id = :id', { id })
                .getOne()
            if (!(joined != null && joined.userId === userId && joined.collection.userId === userId && joined.item.userId === userId)) {
                throw new RpcException('MoleculeCollectionJoinError::incoherent userIds')
            }
        })

        return true
    }

    async remove(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {
        await this.joinRepo.delete({ collectionId, itemId, userId })
        return true
    }
}
