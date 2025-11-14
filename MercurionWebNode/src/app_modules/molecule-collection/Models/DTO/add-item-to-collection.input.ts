import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType()
export class AddItemToCollectionInput {
    @IsUUID()
    @Field(() => ID)
    collectionId: string
    @IsUUID()
    @Field(() => ID)
    itemId: string
}
