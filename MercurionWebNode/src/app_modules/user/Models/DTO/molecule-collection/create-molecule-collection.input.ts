import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateMoleculeCollectionInput {
    @Field()
    name: string
}