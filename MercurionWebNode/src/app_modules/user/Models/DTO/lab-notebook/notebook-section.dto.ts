import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class NotebookSectionDTO {

    @Field(() => ID)
    id: string

    @Field()
    title: string

    @Field({ nullable: true })
    description?: string

    @Field(() => Int)
    order: number

    @Field(() => ID)
    chapterId: string

    @Field(() => ID)
    userId: string
    
}
