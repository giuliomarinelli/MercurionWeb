import { Field, ID, InputType } from "@nestjs/graphql"

@InputType()
export class SyntheticStepInput {
    @Field(() => ID) routeId: string
    @Field() order: number
    @Field(() => String, { nullable: true }) description?: string | null
    @Field(() => String, { nullable: true }) reactionType?: string | null
    @Field(() => String, { nullable: true }) conditions?: string | null
    @Field(() => String, { nullable: true }) rawEditorData?: string | null
    @Field(() => String, { nullable: true }) structureImage?: string | null
}