import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType('LabNotebook')
export class LabNotebookType {

    @Field(() => ID)
    id: string

    @Field(() => ID)
    userId: string

    @Field()
    title: string

    @Field(() => [String], { nullable: 'itemsAndList' })
    chapters?: string[]

    @Field({ nullable: true })
    createdAt?: number

    @Field({ nullable: true })
    updatedAt?: number

}
