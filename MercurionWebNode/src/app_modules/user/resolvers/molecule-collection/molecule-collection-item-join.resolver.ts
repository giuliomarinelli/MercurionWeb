import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { AddItemToCollectionInput } from '../../Models/DTO/molecule-collection/add-item-to-collection.input';
import { MoleculeCollectionItemJoinService } from '../../services/molecule-collection/molecule-collection-item-join.service';
import { UUID } from 'crypto';

@Resolver()
export class MoleculeCollectionItemJoinResolver {

    constructor(private readonly joinService: MoleculeCollectionItemJoinService) { }

    @Mutation(() => Boolean)
    async addItemToCollection(
        @Args('input') input: AddItemToCollectionInput,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.joinService.add(userId, input.collectionId as UUID, input.itemId as UUID)
    }

    @Mutation(() => Boolean)
    async removeItemFromCollection(
        @Args('input') input: AddItemToCollectionInput,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.joinService.remove(userId, input.collectionId as UUID, input.itemId as UUID)
    }
}
