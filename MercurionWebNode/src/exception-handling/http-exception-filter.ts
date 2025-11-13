import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { RpcException } from '@nestjs/microservices';
import { HttpStatusMap } from './http-status-map';
import { GqlContextType } from '@nestjs/graphql';
import { InternalErrorRes } from 'src/Models/error-res.dto';


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

    private readonly isProd = process.env.NODE_ENV === 'production'

    catch(e: unknown, host: ArgumentsHost) {

        const ctxType = host.getType<GqlContextType>()

        if (ctxType === 'graphql' || ctxType === 'ws') return

        const httpCtx = host.switchToHttp()
        const req = httpCtx.getRequest<FastifyRequest>()
        const res = httpCtx.getResponse<FastifyReply>()

        let base: InternalErrorRes

        if (e instanceof RpcException) {
            base = this.handleRpcException(e);
        } else if (e instanceof HttpException) {
            base = this.handleHttpException(e);
        } else {
            // qualunque altra eccezione: 500 generico
            base = {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                error: HttpStatusMap.getDescriptionFromHttpStatusCode(HttpStatus.INTERNAL_SERVER_ERROR,),
                message: (this.isProd ? 'Internal server error' : (e as any).message ?? 'Internal server error') as string
            }
        }

        const status = base.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;

        // in prod, per tutti i 5xx => messaggio generico
        const safeBase: InternalErrorRes = this.isProd && status >= 500
            ? {
                statusCode: status,
                error: base.error ?? HttpStatusMap.getDescriptionFromHttpStatusCode(status),
                message: 'Internal server error'
            }
            : base;

        res.code(status).send({
            ...safeBase,
            timestamp: new Date().toISOString(),
            path: req.url,
            requestId: req.id
        })
    }

    private handleHttpException(e: HttpException): InternalErrorRes {

        const status = e.getStatus()
        const resp = e.getResponse()

        if (typeof resp === 'string') {
            return {
                statusCode: status,
                error: HttpStatusMap.getDescriptionFromHttpStatusCode(status),
                message: this.isProd && status >= 500 ? undefined : resp
            }
        }

        const r = resp as Partial<InternalErrorRes>

        return {
            statusCode: r.statusCode ?? status,
            error: r.error ?? HttpStatusMap.getDescriptionFromHttpStatusCode(r.statusCode ?? status),
            // per i 4xx => in prod si può lasciare il messaggio (di solito è di dominio)
            // per i 5xx verrà comunque sovrascritto a livello chiamante se isProd
            message: r.message
        }
    }

    private handleRpcException(e: RpcException): InternalErrorRes {

        const raw = e.getError();
        const msg = (typeof raw === 'string' ? raw : (raw as any)?.message ?? e.message) as string

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR

        switch (msg) {
            case 'UserRegistrationConflict::Email already exists':
            case 'ChangeEmail::NewEmailIsCurrentEmail':
            case 'ChangePhone::NumberAlreadySet':
                statusCode = HttpStatus.CONFLICT
                break

            case 'AccountActivation::User not found':
            case 'ChangeEmail::UserNotFound':
            case 'ChangeEmailConfirm::UserNotFound':
            case 'ChangePhone::UserNotFound':
            case 'NoSuchUser':
                statusCode = HttpStatus.NOT_FOUND
                break

            case 'ChangeEmail::EmailAlreadyInUseOrPending':
            case 'ChangePhone::NumberAlreadyUsedOrPending':
            case 'NotAllowedAction':
            case 'InvalidOrExpiredChangePasswordToken':
            case 'PasswordReused':
            case 'ChEMBLItemAddError::Forbidden':
            case 'CustomItemAddError::Forbidden':
            case 'InvalidSessionSignature':
            case 'InvalidSession':
            case 'MfaTemporarilyLocked':
                statusCode = HttpStatus.FORBIDDEN
                break

            case 'ChangeEmailConfirm::NoUnconfirmedEmail':
                statusCode = HttpStatus.BAD_REQUEST
                break

            case 'ChangeEmailConfirm::InvalidTotp':
            case 'ChangePhone::InvalidTOTP':
            case 'InvalidJwtValidation':
            case 'AuthenticationInvalidCredentials':
            case 'Unauthanticated':
                statusCode = HttpStatus.UNAUTHORIZED
                break

            case 'Authentication::TooManyAttempts':
            case 'Mfa::TooManyAttempts':
            case 'MfaSend::TooManyRequests':
            case 'ChangeEmail::TooManyAttempts':
            case 'ChangePhone::TooManyAttempts':
            case 'ChangeEmailSend::TooManyRequests':
            case 'ChangePhoneSend::TooManyRequests':
            case 'Password::TooManyAttempts':
            case 'PasswordResetSend::TooManyRequests':
            case 'BackupCode::TooManyAttempts':
            case 'BackupCodeRegen::TooManyRequests':
                statusCode = HttpStatus.TOO_MANY_REQUESTS
                break
        }

        return {
            statusCode,
            error: HttpStatusMap.getDescriptionFromHttpStatusCode(statusCode),
            message: msg
        }
    }
}
