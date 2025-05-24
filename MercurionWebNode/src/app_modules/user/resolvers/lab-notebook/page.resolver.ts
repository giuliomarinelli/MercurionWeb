import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { NotebookPageService } from '../../services/lab-notebook/notebook-page.service';
import { UUID } from 'crypto';
import { NotebookPage } from '../../Models/entities/lab-notebook/lab-notebook-page.entity';
import { CreatePageInput } from '../../Models/DTO/lab-notebook/create-page-input';
import { UpdatePageInput } from '../../Models/DTO/lab-notebook/update-page-input';
import { AuthenticatedUserId, Public } from 'src/metadata/metadata';

@Resolver(() => NotebookPage)
export class PageResolver {

    constructor(private readonly pageService: NotebookPageService) { }

    @Public()
    @Query(() => NotebookPage, { nullable: true })
    page(
        @Args(
            'id', { type: () => String }) id: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage | null> {
        return this.pageService.getPage(id as UUID, userId)
    }

    @Public()
    @Query(() => [NotebookPage])
    pagesBySection(
        @Args('sectionId', { type: () => String }) sectionId: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage[]> {
        return this.pageService.findBySection(sectionId as UUID, userId)
    }

    @Public()
    @Mutation(() => NotebookPage)
    createPage(
        @Args('sectionId', { type: () => String }) sectionId: string,
        @Args('input') input: CreatePageInput,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage> {
        return this.pageService.createPage(sectionId as UUID, userId, input)
    }

    @Public()
    @Mutation(() => NotebookPage, { nullable: true })
    async updatePage(
        @Args('input') { id, ...input }: UpdatePageInput,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage | null> {
        return this.pageService.updatePage(id as UUID, userId, input)
    }

    @Public()
    @Mutation(() => Boolean)
    deletePage(
        @Args('id', { type: () => String }) id: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.pageService.deletePage(id as UUID, userId)
    }

}


