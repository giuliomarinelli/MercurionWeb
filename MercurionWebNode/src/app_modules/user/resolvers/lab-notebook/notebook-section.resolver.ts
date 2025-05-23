import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { NotebookSectionDTO } from '../../Models/DTO/lab-notebook/notebook-section.dto';
import { NotebookSectionService } from '../../services/lab-notebook/notebook-section.service';
import { AuthenticatedUserId, Public } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { CreateSectionInput } from '../../Models/DTO/lab-notebook/create-section-input';
import { UpdateSectionInput } from '../../Models/DTO/lab-notebook/update-section-input';
import { NotFoundException } from '@nestjs/common';
import { NotebookSection } from '../../Models/entities/lab-notebook/lab-notebook-section.entity';



@Resolver(() => NotebookSectionDTO)
export class NotebookSectionResolver {
    
    constructor(private readonly sectionService: NotebookSectionService) { }

    @Public()
    @Query(() => [NotebookSectionDTO])
    async sectionByChapterId(
        @Args('chapterId', { type: () => ID }) chapterId: string,
        @AuthenticatedUserId() userId: string
    ): Promise<NotebookSection> {
        const result: NotebookSection | null = await this.sectionService.getSection(userId as UUID, chapterId as UUID)
        if (result == null) {
            throw new NotFoundException()
        }
        return result
    }

    @Public()
    @Mutation(() => NotebookSectionDTO)
    async createSection(
        @Args('input') input: CreateSectionInput,
        @AuthenticatedUserId() userId: string
    ): Promise<NotebookSectionDTO> {
        return this.sectionService.createToDTO(userId as UUID, input.chapterId as UUID, input)
    }

    @Public()
    @Mutation(() => NotebookSectionDTO)
    async updateSection(
        @Args('input') { id, ...input }: UpdateSectionInput,
        @AuthenticatedUserId() userId: string
    ): Promise<NotebookSectionDTO | null> {
        return this.sectionService.updateToDTO(userId as UUID, id as UUID, input)
    }

    @Public()
    @Mutation(() => Boolean)
    async deleteSection(
        @Args('id', { type: () => ID }) id: string,
        @AuthenticatedUserId() userId: string
    ): Promise<boolean> {
        await this.sectionService.delete(userId as UUID, id as UUID)
        return true
    }
    
}
