import { Resolver, Query, Mutation, Args, ID, Info } from '@nestjs/graphql';
import { AuthenticatedUserId } from 'src/metadata/metadata'; // tuo custom decorator userId
import { UUID } from 'crypto';
import { GraphQLResolveInfo } from 'graphql';
import { MoleculeCollection } from '../../Models/entities/molecule-collection/molecule-collection.entity';
import { MoleculeCollectionService } from '../../services/molecule-collection/molecule-collection.service';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';


@Resolver(() => MoleculeCollection)
export class MoleculeCollectionResolver {

    constructor(private readonly collectionService: MoleculeCollectionService) { }

    // Query: Lista collezioni dell'utente
    @Query(() => [MoleculeCollection])
    async myMoleculeCollections(
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollection[]> {
        // Info per selezione campi, come pattern visto prima
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.collectionService.findAllByUser(userId, fieldsMap)
    }

    // Query: Dettaglio collezione
    @Query(() => MoleculeCollection, { nullable: true })
    async moleculeCollection(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollection | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.collectionService.findOne(id, userId, fieldsMap)
    }

    // Mutation: Crea collezione
    @Mutation(() => MoleculeCollection)
    async createMoleculeCollection(
        @Args('name') name: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<MoleculeCollection> {
        return this.collectionService.create(userId, name)
    }

    // Mutation: Aggiorna collezione
    @Mutation(() => MoleculeCollection)
    async updateMoleculeCollection(
        @Args('id', { type: () => ID }) id: UUID,
        @Args('name') name: string,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollection | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.collectionService.update(id, userId, { name }, fieldsMap)
    }

    // Mutation: Elimina collezione
    @Mutation(() => Boolean)
    async deleteMoleculeCollection(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.collectionService.delete(id, userId)
    }
}
