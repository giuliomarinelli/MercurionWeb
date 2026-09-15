import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, Matches } from "class-validator";
import type { SignedSessionIdDTO as SignedSessionIdContract } from '@mercurion/rest-contracts'

export class SignedSessionIdDTO implements SignedSessionIdContract {

    @IsString()
    @IsNotEmpty()
    @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\.[0-9a-fA-F]{64}$/)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    signedSessionId: string

}
