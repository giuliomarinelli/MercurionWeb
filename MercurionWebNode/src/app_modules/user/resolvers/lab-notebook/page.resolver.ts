import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Page } from '../../Models/DTO/lab-notebook/page';
import { NotebookPageService } from '../../services/lab-notebook/notebook-page.service';
import { UUID } from 'crypto';
import { NotebookPage } from '../../Models/entities/lab-notebook/lab-notebook-page.entity';
import { CreatePageInput } from '../../Models/DTO/lab-notebook/create-page-input';
import { UpdatePageInput } from '../../Models/DTO/lab-notebook/update-page-input';
import { AuthenticatedUserId } from 'src/metadata/metadata';


@Resolver(() => Page)
export class PageResolver {

    constructor(private readonly pageService: NotebookPageService) { }

    @Query(() => Page, { nullable: true })
    page(
        @Args(
            'id', { type: () => String }) id: string,
            @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage | null> {
        return this.pageService.getPage(id as UUID, userId)
    }

    @Query(() => [Page])
    pagesBySection(
        @Args('sectionId', { type: () => String }) sectionId: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage[]> {
        return this.pageService.findBySection(sectionId as UUID, userId)
    }

    @Mutation(() => Page)
    createPage(
        @Args('sectionId', { type: () => String }) sectionId: string, 
        @Args('input') input: CreatePageInput,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage> {
        return this.pageService.createPage(sectionId as UUID, userId, input)
    }

    @Mutation(() => Page, { nullable: true })
    async updatePage(
        @Args('input') { id, ...input }: UpdatePageInput,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage | null> {
        return this.pageService.updatePage(id as UUID, userId, input)
    }

    @Mutation(() => Boolean)
    deletePage(
        @Args('id', { type: () => String }) id: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.pageService.deletePage(id as UUID, userId)
    }
}


