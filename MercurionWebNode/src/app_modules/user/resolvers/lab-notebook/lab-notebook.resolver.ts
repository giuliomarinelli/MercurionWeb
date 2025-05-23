import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { LabNotebook } from '../../Models/entities/lab-notebook/lab-notebook.entity';
import { UpdateLabNotebookInput } from '../../Models/DTO/lab-notebook/update-lab-notebook-input';
import { UUID } from 'crypto';
import { AuthenticatedUserId, Public } from 'src/metadata/metadata';
import { LabNotebookService } from '../../services/lab-notebook/lab-notebook.service';



@Resolver(() => LabNotebook)
export class LabNotebookResolver {

    constructor(private readonly notebookService: LabNotebookService) { }

    @Public()
    @Query(() => [LabNotebook])
    async labNotebooksByUser(@AuthenticatedUserId() userId: string): Promise<LabNotebook[]> {
        return this.notebookService.findAllByUser(userId as UUID)
    }

    @Public()
    @Query(() => LabNotebook, { nullable: true })
    async labNotebook(
        @Args('id') id: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<LabNotebook | null> {
        return this.notebookService.findOne(id as UUID, userId)
    }

    @Public()
    @Mutation(() => LabNotebook)
    async createLabNotebook(
        @AuthenticatedUserId() userId: UUID,
        @Args('title') title: string
    ): Promise<LabNotebook> {
        return this.notebookService.create(userId, title)
    }

    @Public()
    @Mutation(() => LabNotebook)
    async updateLabNotebook(@Args('input') { id, ...input }: UpdateLabNotebookInput,
        @AuthenticatedUserId() userId: UUID
    ): Promise<LabNotebook | null> {
        return this.notebookService.update(id as UUID, userId, input)
    }

    @Public()
    @Mutation(() => Boolean)
    async deleteLabNotebook(@Args('id') id: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.notebookService.delete(id as UUID, userId)
    }
}
