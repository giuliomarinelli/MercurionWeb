import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { LabNotebook } from '../../Models/entities/lab-notebook/lab-notebook.entity';
import { LabNotebookService } from '../../services/lab-notebook.service';
import { UpdateLabNotebookInput } from '../../Models/DTO/lab-notebook/update-lab-notebook-input';
import { UUID } from 'crypto';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { LabNotebookType } from '../../Models/DTO/lab-notebook/lab-notebook-type';



@Resolver(() => LabNotebookType)
export class LabNotebookResolver {

    constructor(private readonly notebookService: LabNotebookService) { }

    @Query(() => [LabNotebookType])
    async labNotebooksByUser(@AuthenticatedUserId() userId: string): Promise<LabNotebook[]> {
        return this.notebookService.findAllByUser(userId as UUID)
    }

    @Query(() => LabNotebookType, { nullable: true })
    async labNotebook(
        @Args('id') id: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<LabNotebook | null> {
        return this.notebookService.findOne(id as UUID, userId)
    }

    // @Public()
    @Mutation(() => LabNotebookType)
    async createLabNotebook(
        @AuthenticatedUserId() userId: UUID,
        @Args('title') title: string
    ): Promise<LabNotebook> {
        return this.notebookService.create(userId, title)
    }

    @Mutation(() => LabNotebookType)
    async updateLabNotebook(@Args('input') { id, ...input }: UpdateLabNotebookInput,
        @AuthenticatedUserId() userId: UUID
    ): Promise<LabNotebook | null> {
        return this.notebookService.update(id as UUID, userId, input)
    }

    @Mutation(() => Boolean)
    async deleteLabNotebook(@Args('id') id: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.notebookService.delete(id as UUID, userId)
    }
}
