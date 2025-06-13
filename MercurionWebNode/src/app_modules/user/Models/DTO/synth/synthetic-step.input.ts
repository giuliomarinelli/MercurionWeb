import { Field, ID, InputType } from "@nestjs/graphql"

@InputType()
export class SyntheticStepInput {
    @Field(() => ID) routeId: string
    @Field() order: number
    @Field({ nullable: true }) description?: string
    @Field({ nullable: true }) reactionType?: string
    @Field({ nullable: true }) conditions?: string
    @Field({ nullable: true }) rawEditorData?: string
    @Field({ nullable: true }) structureImage?: string
}