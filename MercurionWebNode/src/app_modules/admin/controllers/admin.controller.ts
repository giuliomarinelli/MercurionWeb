import { Body, Controller, ForbiddenException, Get, Put, Query, Res, ValidationPipe } from '@nestjs/common';
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum';
import { HasScopes, Public } from 'src/metadata/metadata';
import { ChangeLogLevelDTO } from '../Models/DTO/change-log-level.dto';
import { ConfirmNewLogLevelsDTO } from 'src/Models/confirm-responses.dto';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { ResponseService } from 'src/services/response.service';
import { FastifyReply } from 'fastify';


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

    @Public()
    @Get('/maintenance')
    getAdminMaintenanceCookie(
        @Res({ passthrough: true }) reply: FastifyReply, @Query('t') t: string): { ok: true } {
        // TODO: fare hashing argon2 in db e hardening, adesso importa solo far funzionare il gate. Non esponiamo 
        // questioni di sicurezza, solo un sito graficamente ancora non pronto, specie per safari
        if (t === '66b590cef2b899cbd1f72fa7a4424f23ba4ec212c627bf674469ef170e52a4cd7711b126f770280bac9eaa4c3c3dcdda9049e40f345c14c538faefb969b417ff') {
            reply.setCookie('_mercurion_admin_maintenance', 'SjO62ztQ9MCwfZ2/eL3uDXmLb66vFchAAO6vmlfZDHDcj5FjskTNOGrCsaqgxG0/o0RAEXnqzU7eGUd3toVi8aMpuG1oTfcSbqS+4d5zkau/PsTbdjlUxWTLu3+zJv7IxZHlK5i8FWRpal2Ts7DeY2zIIt5M+oGcZ8M58T6OdWM=', {
                httpOnly: true,
                sameSite: 'strict',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                domain: 'mercurion.app',
                maxAge: 3600 * 24 * 7
            })
            return { ok: true }
        }
        throw new ForbiddenException()
    }

}
