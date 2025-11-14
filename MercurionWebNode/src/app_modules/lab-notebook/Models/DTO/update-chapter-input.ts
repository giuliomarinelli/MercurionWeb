import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsOptional, IsString, IsUUID } from "class-validator";

@InputType()
export class UpdateChapterInput {
    
    @IsUUID()
    @Field(() => ID) 
    id: string
    
    @IsOptional()
    @IsString()
    @Field({ nullable: true }) 
    title?: string
    
    @IsOptional()
    @IsInt()
    @Field(() => Int, { nullable: true }) 
    order?: number
    
}
