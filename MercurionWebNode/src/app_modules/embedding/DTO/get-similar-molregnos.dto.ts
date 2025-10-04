// embedding/dto/get-similar-molregnos.dto.ts
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class GetSimilarMolregnosDto {
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    molregno!: number;

    @Transform(({ value }) => (value === undefined ? 10 : Number(value)))
    @IsOptional()
    @IsInt()
    @Min(1)
    n?: number = 10;

    @Transform(({ value }) => (value === undefined ? 10 : Boolean(value)))
    @IsOptional()
    @IsBoolean()
    only_molregnos?: boolean = false;
}
