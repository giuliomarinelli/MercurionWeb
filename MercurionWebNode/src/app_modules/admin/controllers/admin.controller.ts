/* eslint-disable @typescript-eslint/no-unused-vars */
// Lo imposto temporaneamente a false per evitare warning di variabili non utilizzate, in quanto alcune funzioni sono ancora in fase di implementazione e non vorrei che le nostre pipeline 
// creassero problemi per dei falsi positivi di linting. Una volta che tutte le funzioni saranno implementate, rimetterò a true questa regola di linting.
// ================================================================
import { Body, Controller, ForbiddenException, Get, Param, Put, ValidationPipe } from '@nestjs/common'
import { Scope } from 'src/app_modules/user/models/enums/scope.enum'
import { HasScopes, Public } from 'src/metadata/metadata'
import { ChangeLogLevelDTO } from '../models/dto/change-log-level.dto'
import { ConfirmNewLogLevelsDTO } from 'src/models/confirm-responses.dto'
import { LoggerPort } from 'src/logging/logger.port'
import { ResponseService } from 'src/services/response.service'
import type { MaintenanceBypassResponse } from '@mercurion/rest-contracts'


@Controller('admin')
export class AdminController {

    constructor(
        private readonly loggerFactory: LoggerPort,
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

    /** 
     * @deprecated This endpoint is deprecated and will be removed in future versions. Please use the new maintenance bypass mechanism based on Cloudflare Zero Trust Access Control.
    */
    @Public()
    @Get('/maintenance')
    getAdminMaintenanceCookie(): MaintenanceBypassResponse {                
        throw new ForbiddenException()
    }

    @HasScopes(Scope.AssignScopes, Scope.ViewUsers)
    @Get('/scopes/:user_id')
    getScopesByUserId(@Param('user_id') userId: string) {
        // Implementation for fetching scopes for a specific user
    }

    @HasScopes(Scope.AssignScopes, Scope.ViewUsers)
    @Put('/scopes/:user_id')
    setScopesForUser(@Param('user_id') userId: string, 
    @Body() scopes: Array<keyof typeof Scope>
) {
        // Implementation for setting scopes for a specific user
    }

    @HasScopes(Scope.AssignScopes, Scope.ViewUsers)
    @Put('/scopes/:user_id/remove')
    removeScopesForUser(@Param('user_id') userId: string, @Body() scopes: Array<keyof typeof Scope>) {
        // Implementation for removing scopes for a specific user
    }

}
