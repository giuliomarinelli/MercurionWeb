import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Page } from '../../Models/DTO/lab-notebook/page';
import { NotebookPageService } from '../../services/lab-notebook/notebook-page.service';
import { UUID } from 'crypto';
import { NotebookPage } from '../../Models/entities/lab-notebook/lab-notebook-page.entity';
import { CreatePageInput } from '../../Models/DTO/lab-notebook/create-page-input';
import { UpdatePageInput } from '../../Models/DTO/lab-notebook/update-page-input';

@Resolver(() => Page)
export class PageResolver {

    constructor(private readonly pageService: NotebookPageService) { }

    @Query(() => Page, { nullable: true })
    page(@Args('id', { type: () => String }) id: string): Promise<NotebookPage | null> {
        return this.pageService.getPage(id as UUID)
    }

    @Query(() => [Page])
    pagesBySection(@Args('sectionId', { type: () => String }) sectionId: string) {
        return this.pageService.findBySection(sectionId as UUID)
    }

    @Mutation(() => Page)
    createPage(@Args('sectionId', { type: () => String }) sectionId: string, @Args('input') input: CreatePageInput): Promise<NotebookPage> {
        return this.pageService.createPage(sectionId as UUID, input)
    }

    @Mutation(() => Page)
    updatePage(@Args('input') { id, ...input }: UpdatePageInput) {
        return this.pageService.updatePage(id as UUID, input)
    }

    @Mutation(() => Boolean)
    deletePage(@Args('id', { type: () => String }) id: string) {
        return this.pageService.deletePage(id as UUID)
    }
}


