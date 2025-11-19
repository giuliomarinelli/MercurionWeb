import { Body, Controller, Put, ValidationPipe } from '@nestjs/common';
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum';
import { HasScopes } from 'src/metadata/metadata';
import { ChangeLogLevelDTO } from '../Models/DTO/change-log-level.dto';
import { ConfirmNewLogLevelsDTO } from 'src/Models/confirm-responses.dto';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { ResponseService } from 'src/services/response.service';

@Controller('admin')
export class AdminController {

    constructor(
        private readonly loggerFactory: MeiliLoggerService,
        private readonly _r: ResponseService
    ) { }

    @Put('/change-log-levels')
    @HasScopes(Scope.ChangeLogLevels)
    async changeLogLevels(@Body(new ValidationPipe({ transform: true })) { logLevels }: ChangeLogLevelDTO): Promise<ConfirmNewLogLevelsDTO> {
        this.loggerFactory.setLogLevels(logLevels)
        return {
            ...this._r.ok('Logger levels changed successfully.'),
            currentLogLevels: logLevels
        }
    }

}
