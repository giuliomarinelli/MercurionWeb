import { Resolver, Query, Mutation, Args, ID, Info } from '@nestjs/graphql';
import { NotebookChapterService } from '../../services/lab-notebook/notebook-chapter.service';
import { UUID } from 'crypto';
import { CreateChapterInput } from '../../Models/DTO/lab-notebook/create-notebook-chapter-input';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { UpdateChapterInput } from '../../Models/DTO/lab-notebook/update-chapter-input';
import { GraphQLResolveInfo } from 'graphql';
import { NotebookChapter } from '../../Models/entities/lab-notebook/lab-notebook-chapter.entity';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';
import { GraphQLFieldsMap } from 'src/type-orm-utils/type-orm-utils';

@Resolver(() => NotebookChapter)
export class NotebookChapterResolver {

    constructor(private readonly chapterService: NotebookChapterService) { }

    @Query(() => [NotebookChapter])
    async chaptersByNotebook(
        @Args('notebookId', { type: () => ID }) notebookId: string,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<NotebookChapter[]> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info) as GraphQLFieldsMap
        return this.chapterService.listChapters(
            notebookId as UUID,
            userId,
            fieldsMap
        )
    }

    @Query(() => NotebookChapter)
    async chapterById(
        @Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<NotebookChapter | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info) as GraphQLFieldsMap
        return this.chapterService.getChapter(
            id as UUID,
            userId,
            fieldsMap
        )
    }


    @Mutation(() => NotebookChapter)
    async createChapter(
        @Args('input') { notebookId, title }: CreateChapterInput,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookChapter> {
        return this.chapterService.createChapter(
            notebookId as UUID,
            userId,
            { title }
        )
    }

    @Mutation(() => NotebookChapter)
    async updateChapter(
        @Args('input') { id, ...input }: UpdateChapterInput,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<NotebookChapter | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info) as GraphQLFieldsMap
        return this.chapterService.updateChapter(id as UUID, userId, input, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteChapter(
        @Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: UUID
    ) {
        await this.chapterService.deleteChapter(id as UUID, userId)
        return true
    }

    @Mutation(() => Boolean)
    async moveChapter(
        @Args('chapterId', { type: () => ID }) chapterId: string,
        @Args('direction') direction: 'up' | 'down',
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        await this.chapterService.move(chapterId as UUID, userId, direction)
        return true
    }

    @Mutation(() => Boolean)
    async reorderChapters(
        @Args('notebookId', { type: () => ID }) notebookId: string,
        @Args('orderedIds', { type: () => [ID] }) orderedIds: string[],
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        await this.chapterService.reorder(notebookId as UUID, userId, orderedIds as UUID[])
        return true
    }

}
