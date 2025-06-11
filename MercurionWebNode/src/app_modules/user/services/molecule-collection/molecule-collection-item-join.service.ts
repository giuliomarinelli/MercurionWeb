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

    async add(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {
        // (Potresti aggiungere qui check che l'utente possieda sia collection che item)
        const join = this.joinRepo.create({
            collection: { id: collectionId },
            item: { id: itemId }
        });
        await this.joinRepo.save(join);
        return true;
    }

    async remove(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {
        await this.joinRepo.delete({ collectionId, itemId })
        return true
    }
}
