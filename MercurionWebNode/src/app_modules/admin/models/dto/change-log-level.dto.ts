import { LogLevel, LOG_LEVELS } from '@nestjs/common';
import { IsArray, IsIn } from 'class-validator';

export class ChangeLogLevelDTO {
    @IsArray()
    @IsIn(LOG_LEVELS, { each: true })
    logLevels: LogLevel[]
}
