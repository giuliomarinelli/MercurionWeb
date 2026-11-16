import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'

export enum SynthCommandOutcome {
    Updated = 'UPDATED',
    Deleted = 'DELETED',
}

registerEnumType(SynthCommandOutcome, { name: 'SynthCommandOutcome' })

@ObjectType()
export class SynthCommandResult {
    @Field(() => Boolean)
    success!: true

    @Field(() => SynthCommandOutcome)
    outcome!: SynthCommandOutcome
}
