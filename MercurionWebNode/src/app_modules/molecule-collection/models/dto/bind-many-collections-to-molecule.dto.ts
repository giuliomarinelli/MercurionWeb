import { Field, ID, ObjectType } from "@nestjs/graphql";
import { UUID } from "crypto";

@ObjectType()
export class BindManyCollectionsToMoleculeDTO {

    @Field(() => Boolean)
    ok: boolean

    @Field(() => ID, { nullable: true })
    moleculeUUID: UUID | null

}