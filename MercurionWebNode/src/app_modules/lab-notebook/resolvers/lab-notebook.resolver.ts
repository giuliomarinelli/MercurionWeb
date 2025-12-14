import { Resolver, Query, Mutation, Args, ID, Info } from '@nestjs/graphql';
import { LabNotebook } from '../Models/entities/lab-notebook.entity';
import { UUID } from 'crypto';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { LabNotebookService } from '../services/lab-notebook.service';
import { GraphQLResolveInfo } from 'graphql';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap } from 'src/utils/type-orm-utils/type-orm-utils';
import { UpdateLabNotebookInput } from '../Models/DTO/update-lab-notebook-input';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';


@Resolver(() => LabNotebook)
export class LabNotebookResolver {

    constructor(private readonly notebookService: LabNotebookService) { }

    private ensureUuid(value: string, field: string): void {
        GeneralUtils.ensureValidUUIDv7(value, `GraphQLInvalid::Invalid ${field}`)
    }

    @Query(() => [LabNotebook])
    async labNotebooksByUser(
        @AuthenticatedUserId() userId: string,
        @Info() info: GraphQLResolveInfo
    ): Promise<LabNotebook[]> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info) as GraphQLFieldsMap
        return this.notebookService.findAllByUser(userId as UUID, fieldsMap)
    }

    @Query(() => LabNotebook, { nullable: true })
    async labNotebook(
        @Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<LabNotebook | null> {
        this.ensureUuid(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info) as GraphQLFieldsMap
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
        this.ensureUuid(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info) as GraphQLFieldsMap
        return this.notebookService.update(id as UUID, userId, input, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteLabNotebook(@Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        this.ensureUuid(id, 'id')
        return this.notebookService.delete(id as UUID, userId)
    }

}
