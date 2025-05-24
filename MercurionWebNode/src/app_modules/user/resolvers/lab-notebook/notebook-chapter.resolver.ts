import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { NotebookChapterService } from '../../services/lab-notebook/notebook-chapter.service';
import { UUID } from 'crypto';
import { CreateChapterInput } from '../../Models/DTO/lab-notebook/create-notebook-chapter-input';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { UpdateChapterInput } from '../../Models/DTO/lab-notebook/update-chapter-input';
import { NotebookChapter } from '../../Models/entities/lab-notebook/lab-notebook-chapter.entity';
import { NotebookSection } from '../../Models/entities/lab-notebook/lab-notebook-section.entity';


@Resolver(() => NotebookChapter)
export class NotebookChapterResolver {

    constructor(private readonly chapterService: NotebookChapterService) { }

    @Query(() => [NotebookChapter])
    async sections(
        @Args('chapterId', { type: () => ID }) chapterId: string,
        @AuthenticatedUserId() userId: string
    ): Promise<NotebookChapter[]> {
        return this.chapterService.list(userId as UUID, chapterId as UUID)
    }

    @Query(() => [NotebookChapter])
    async chaptersByNotebook(
        @Args('notebookId', { type: () => ID }) notebookId: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookChapter[]> {
        return this.chapterService.listChapters(notebookId as UUID, userId)
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
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookChapter | null> {
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

    @ResolveField(() => [NotebookSection])
    resolveSections(@Parent() chapter: NotebookChapter): NotebookSection[] {
        return chapter.sections ?? []
    }

}
