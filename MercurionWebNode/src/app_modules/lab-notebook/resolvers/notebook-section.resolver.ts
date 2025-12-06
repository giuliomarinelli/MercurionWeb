import { Resolver, Query, Mutation, Args, ID, Info } from '@nestjs/graphql';
import { NotebookSectionService } from '../services/notebook-section.service';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { NotebookSection } from '../Models/entities/lab-notebook-section.entity';
import { GraphQLResolveInfo } from 'graphql';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap } from 'src/utils/type-orm-utils/type-orm-utils';
import { CreateSectionInput } from '../Models/DTO/create-section-input';
import { UpdateSectionInput } from '../Models/DTO/update-section-input';


@Resolver(() => NotebookSection)
export class NotebookSectionResolver {

    constructor(private readonly sectionService: NotebookSectionService) { }

    @Query(() => NotebookSection)
    async sectionByChapterId(
        @Args('chapterId', { type: () => ID }) chapterId: string,
        @AuthenticatedUserId() userId: string,
        @Info() info: GraphQLResolveInfo
    ): Promise<NotebookSection> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info) as GraphQLFieldsMap;
        const result: NotebookSection | null = await this.sectionService.getSectionByChapterId(
            userId as UUID,
            chapterId as UUID,
            fieldsMap
        );
        if (result == null) throw new NotFoundException()
        return result;
    }

    @Query(() => NotebookSection)
    async sectionById(
        @Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<NotebookSection | null> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info) as GraphQLFieldsMap
        return this.sectionService.getSection(
            id as UUID,
            userId,
            fieldsMap
        );
    }

    @Mutation(() => NotebookSection)
    async createSection(
        @Args('input') input: CreateSectionInput,
        @AuthenticatedUserId() userId: string
    ): Promise<NotebookSection> {
        return this.sectionService.create(userId as UUID, input.chapterId, input)
    }

    @Mutation(() => NotebookSection)
    async updateSection(
        @Args('input') { id, ...input }: UpdateSectionInput,
        @AuthenticatedUserId() userId: string,
        @Info() info: GraphQLResolveInfo
    ): Promise<NotebookSection | null> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.sectionService.update(userId as UUID, id as UUID, input, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteSection(
        @Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: string
    ): Promise<boolean> {
        await this.sectionService.delete(userId as UUID, id as UUID)
        return true
    }

    @Mutation(() => Boolean)
    async moveSection(
        @Args('sectionId', { type: () => ID }) sectionId: string,
        @Args('direction') direction: 'up' | 'down',
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        await this.sectionService.move(userId, sectionId as UUID, direction)
        return true
    }

    @Mutation(() => Boolean)
    async reorderSections(
        @Args('chapterId', { type: () => ID }) chapterId: string,
        @Args('orderedIds', { type: () => [ID] }) orderedIds: string[],
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        await this.sectionService.reorder(userId, chapterId as UUID, orderedIds as UUID[])
        return true
    }



}
