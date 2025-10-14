import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class AddItemToCollectionInput {
    @Field(() => ID)
    collectionId: string
    @Field(() => ID)
    itemId: string
}
