import { IsString, IsUUID } from "class-validator";
import { UUID } from "crypto";

export class CreateNoteDto {

    @IsUUID()
    userId: UUID

    @IsString()
    title: string

    @IsString()
    content: string

}
