import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { NotebookChapterType } from '../../Models/DTO/lab-notebook/notebook-chapter';
import { NotebookChapterService } from '../../services/lab-notebook/notebook-chapter.service';
import { UUID } from 'crypto';
import { CreateChapterInput } from '../../Models/DTO/lab-notebook/create-notebook-chapter-input';
import { AuthenticatedUserId, Public } from 'src/metadata/metadata';
import { UpdateChapterInput } from '../../Models/DTO/lab-notebook/update-chapter-input';

@Public()
@Resolver(() => NotebookChapterType)
export class NotebookChapterResolver {

    constructor(private readonly chapterService: NotebookChapterService) { }

    @Query(() => [NotebookChapterType])
    async chaptersByNotebook(
        @Args('notebookId', { type: () => ID }) notebookId: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookChapterType[]> {
        return this.chapterService.listChaptersToDTO(notebookId as UUID, userId)
    }

    @Mutation(() => NotebookChapterType)
    async createChapter(
        @Args('input') { notebookId, title }: CreateChapterInput,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookChapterType> {
        return this.chapterService.createChapter(
            notebookId as UUID,
            userId,
            { title }
        )
    }

    @Mutation(() => NotebookChapterType)
    async updateChapter(
        @Args('input') { id, ...input }: UpdateChapterInput,
        @AuthenticatedUserId() userId: UUID    
    ): Promise<NotebookChapterType | null> {
        return this.chapterService.updateChapter(id as UUID, userId, input)
    }

    @Mutation(() => Boolean)
    async deleteChapter(
        @Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: UUID
    ) {
        await this.chapterService.deleteChapter(id as UUID, userId)
        return true
    }
}
