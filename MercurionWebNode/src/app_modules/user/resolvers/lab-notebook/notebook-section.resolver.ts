import { Resolver, Query, Mutation, Args, ID, Info } from '@nestjs/graphql';
import { NotebookSectionService } from '../../services/lab-notebook/notebook-section.service';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { CreateSectionInput } from '../../Models/DTO/lab-notebook/create-section-input';
import { UpdateSectionInput } from '../../Models/DTO/lab-notebook/update-section-input';
import { NotFoundException } from '@nestjs/common';
import { NotebookSection } from '../../Models/entities/lab-notebook/lab-notebook-section.entity';
import { GraphQLResolveInfo } from 'graphql';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';
import { GraphQLFieldsMap } from 'src/type-orm-utils/type-orm-utils';


@Resolver(() => NotebookSection)
export class NotebookSectionResolver {

    constructor(private readonly sectionService: NotebookSectionService) { }

    @Query(() => NotebookSection)
    async sectionByChapterId(
        @Args('chapterId', { type: () => ID }) chapterId: string,
        @AuthenticatedUserId() userId: string,
        @Info() info: GraphQLResolveInfo
    ): Promise<NotebookSection> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info) as GraphQLFieldsMap;
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
        const fieldsMap = GraphqlUtils.getFieldsMap(info) as GraphQLFieldsMap
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
        return this.sectionService.create(userId as UUID, input.chapterId as UUID, input)
    }

    @Mutation(() => NotebookSection)
    async updateSection(
        @Args('input') { id, ...input }: UpdateSectionInput,
        @AuthenticatedUserId() userId: string,
        @Info() info: GraphQLResolveInfo
    ): Promise<NotebookSection | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
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

}
