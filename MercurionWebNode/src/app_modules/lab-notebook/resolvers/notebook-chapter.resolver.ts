import { Resolver, Query, Mutation, Args, ID, Info } from '@nestjs/graphql';
import { NotebookChapterService } from '../services/notebook-chapter.service';
import { UUID } from 'crypto';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { GraphQLResolveInfo } from 'graphql';
import { NotebookChapter } from '../Models/entities/lab-notebook-chapter.entity';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap } from 'src/utils/type-orm-utils/type-orm-utils';
import { CreateChapterInput } from '../Models/DTO/create-notebook-chapter-input';
import { UpdateChapterInput } from '../Models/DTO/update-chapter-input';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';

@Resolver(() => NotebookChapter)
export class NotebookChapterResolver {

    constructor(private readonly chapterService: NotebookChapterService) { }

    private ensureUuid(value: string, field: string): void {
        GeneralUtils.ensureValidUUIDv7(value, `GraphQLInvalid::Invalid ${field}`)
    }

    @Query(() => [NotebookChapter])
    async chaptersByNotebook(
        @Args('notebookId', { type: () => ID }) notebookId: string,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<NotebookChapter[]> {
        this.ensureUuid(notebookId, 'notebookId')
        const fieldsMap = GraphQLUtils.getFieldsMap(info) as GraphQLFieldsMap
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
        this.ensureUuid(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info) as GraphQLFieldsMap
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
        this.ensureUuid(notebookId, 'notebookId')
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
        this.ensureUuid(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info) as GraphQLFieldsMap
        return this.chapterService.updateChapter(id as UUID, userId, input, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteChapter(
        @Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: UUID
    ) {
        this.ensureUuid(id, 'id')
        await this.chapterService.deleteChapter(id as UUID, userId)
        return true
    }

    @Mutation(() => Boolean)
    async moveChapter(
        @Args('chapterId', { type: () => ID }) chapterId: string,
        @Args('direction') direction: 'up' | 'down',
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        this.ensureUuid(chapterId, 'chapterId')
        await this.chapterService.move(chapterId as UUID, userId, direction)
        return true
    }

    @Mutation(() => Boolean)
    async reorderChapters(
        @Args('notebookId', { type: () => ID }) notebookId: string,
        @Args('orderedIds', { type: () => [ID] }) orderedIds: string[],
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        this.ensureUuid(notebookId, 'notebookId')
        orderedIds.forEach((orderedId) => this.ensureUuid(orderedId, 'orderedIds'))
        await this.chapterService.reorder(notebookId as UUID, userId, orderedIds as UUID[])
        return true
    }

}
