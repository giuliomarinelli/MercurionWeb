import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LabNotebookLinkType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  noteId: string;

  @Field(() => ID)
  itemId: string;
}
