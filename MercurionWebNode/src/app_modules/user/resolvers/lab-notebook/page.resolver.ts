import { Resolver, Query, Mutation, Args, ID, Info } from '@nestjs/graphql';
import { NotebookPageService } from '../../services/lab-notebook/notebook-page.service';
import { UUID } from 'crypto';
import { CreatePageInput } from '../../Models/DTO/lab-notebook/create-page-input';
import { UpdatePageInput } from '../../Models/DTO/lab-notebook/update-page-input';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { GraphQLResolveInfo } from 'graphql';
import { NotebookPage } from '../../Models/entities/lab-notebook/lab-notebook-page.entity';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';


@Resolver(() => NotebookPage)
export class NotebookPagePageResolver {

    constructor(private readonly pageService: NotebookPageService) { }

    @Query(() => NotebookPage, { nullable: true })
    page(
        @Args('id', { type: () => String }) id: string,
        @Info() info: GraphQLResolveInfo,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const relationalFields = GraphqlUtils.getRelationalFields(fieldsMap)
        return this.pageService.getPage(id as UUID, userId, scalarFields, relationalFields)
    }

    @Query(() => [NotebookPage])
    pagesBySection(
        @Args('sectionId', { type: () => String }) sectionId: string,
        @Info() info: GraphQLResolveInfo,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage[]> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const relationalFields = GraphqlUtils.getRelationalFields(fieldsMap)
        return this.pageService.findBySection(sectionId as UUID, userId, scalarFields, relationalFields)
    }

    @Query(() => NotebookPage)
    pageById(
        @Args('id', { type: () => ID }) id: string,
        @Info() info: GraphQLResolveInfo,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const relationalFields = GraphqlUtils.getRelationalFields(fieldsMap)
        return this.pageService.getPage(id as UUID, userId, scalarFields, relationalFields)
    }

    @Mutation(() => NotebookPage)
    createPage(
        @Args('input') input: CreatePageInput,
        @Info() info: GraphQLResolveInfo,
        @AuthenticatedUserId() userId: UUID
    ): Promise<NotebookPage> {
        return this.pageService.createPage(input.sectionId as UUID, userId, input)
    }

    @Mutation(() => NotebookPage, { nullable: true })
    async updatePage(
        @Args('input') { id, ...input }: UpdatePageInput,
        @Info() info: GraphQLResolveInfo,
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

    @Mutation(() => Boolean)
    async movePage(
        @Args('pageId', { type: () => ID }) pageId: string,
        @Args('direction') direction: 'up' | 'down',
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        await this.pageService.movePage(pageId as UUID, userId, direction)
        return true
    }

    @Mutation(() => Boolean)
    async reorderPages(
        @Args('sectionId', { type: () => ID }) sectionId: string,
        @Args('orderedIds', { type: () => [ID] }) orderedIds: string[],
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        await this.pageService.reorderPages(sectionId as UUID, userId, orderedIds as UUID[])
        return true
    }


}