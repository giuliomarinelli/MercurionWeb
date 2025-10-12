import { Resolver, Query, Mutation, Args, ID, Info } from '@nestjs/graphql';
import { LabNotebook } from '../../Models/entities/lab-notebook/lab-notebook.entity';
import { UpdateLabNotebookInput } from '../../Models/DTO/lab-notebook/update-lab-notebook-input';
import { UUID } from 'crypto';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { LabNotebookService } from '../../services/lab-notebook/lab-notebook.service';
import { GraphQLResolveInfo } from 'graphql';
import { GraphqlUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap } from 'src/utils/type-orm-utils/type-orm-utils';


@Resolver(() => LabNotebook)
export class LabNotebookResolver {

    constructor(private readonly notebookService: LabNotebookService) { }

    @Query(() => [LabNotebook])
    async labNotebooksByUser(
        @AuthenticatedUserId() userId: string,
        @Info() info: GraphQLResolveInfo
    ): Promise<LabNotebook[]> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info) as GraphQLFieldsMap
        return this.notebookService.findAllByUser(userId as UUID, fieldsMap)
    }

    @Query(() => LabNotebook, { nullable: true })
    async labNotebook(
        @Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<LabNotebook | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info) as GraphQLFieldsMap
        return this.notebookService.findOne(id as UUID, userId, fieldsMap)
    }

    @Mutation(() => LabNotebook)
    async createLabNotebook(
        @AuthenticatedUserId() userId: UUID,
        @Args('title') title: string
    ): Promise<LabNotebook> {
        return this.notebookService.create(userId, title)
    }

    @Mutation(() => LabNotebook)
    async updateLabNotebook(@Args('input') { id, ...input }: UpdateLabNotebookInput,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<LabNotebook | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info) as GraphQLFieldsMap
        return this.notebookService.update(id as UUID, userId, input, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteLabNotebook(@Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.notebookService.delete(id as UUID, userId)
    }

}
