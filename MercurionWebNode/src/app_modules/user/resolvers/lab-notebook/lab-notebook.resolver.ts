import { Resolver, Query, Mutation, Args, ResolveField, Parent, ID, Info } from '@nestjs/graphql';
import { LabNotebook } from '../../Models/entities/lab-notebook/lab-notebook.entity';
import { UpdateLabNotebookInput } from '../../Models/DTO/lab-notebook/update-lab-notebook-input';
import { UUID } from 'crypto';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { LabNotebookService } from '../../services/lab-notebook/lab-notebook.service';
import { NotebookChapter } from '../../Models/entities/lab-notebook/lab-notebook-chapter.entity';
import { GraphQLResolveInfo } from 'graphql';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';


@Resolver(() => LabNotebook)
export class LabNotebookResolver {

    constructor(private readonly notebookService: LabNotebookService) { }

    @Query(() => [LabNotebook])
    async labNotebooksByUser(
        @AuthenticatedUserId() userId: string,
        @Info() info: GraphQLResolveInfo
    ): Promise<LabNotebook[]> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const relationalFields = GraphqlUtils.getRelationalFields(fieldsMap)
        return this.notebookService.findAllByUser(userId as UUID, scalarFields, relationalFields)
    }

    @Query(() => LabNotebook, { nullable: true })
    async labNotebook(
        @Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<LabNotebook | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info);
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap);
        const relationalFields = GraphqlUtils.getRelationalFields(fieldsMap);
        return this.notebookService.findOne(id as UUID, userId, scalarFields, relationalFields);
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
        @AuthenticatedUserId() userId: UUID
    ): Promise<LabNotebook | null> {
        return this.notebookService.update(id as UUID, userId, input)
    }

    @Mutation(() => Boolean)
    async deleteLabNotebook(@Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.notebookService.delete(id as UUID, userId)
    }

    @ResolveField(() => [NotebookChapter])
    chapters(@Parent() notebook: LabNotebook): NotebookChapter[] {
        return notebook.chapters ?? []
    }
}
