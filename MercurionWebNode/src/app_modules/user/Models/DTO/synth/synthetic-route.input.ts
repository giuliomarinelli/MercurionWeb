import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class SyntheticRouteInput {
    @Field() title: string
    @Field(() => String, { nullable: true }) notes?: string | null
}