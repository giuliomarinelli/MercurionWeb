import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { InternalErrorRes } from "src/Models/error-res.dto";
import { FastifyRequest, FastifyReply } from 'fastify'
import { RpcException } from "@nestjs/microservices";
import { HttpStatusMap } from "./http-status-map";
import { GqlContextType } from "@nestjs/graphql";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

    catch(e: any, host: ArgumentsHost) {

        if (host.getType<GqlContextType>() === 'graphql' || host.getType() === 'ws') return

        const req = host.switchToHttp().getRequest<FastifyRequest>()
        const res = host.switchToHttp().getResponse<FastifyReply>()

        let nonHttpInternalErrorRes: InternalErrorRes = {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Internal Server Error'
        }

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR

        if (e instanceof RpcException) {
            switch (e.message) {
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
            }

            nonHttpInternalErrorRes = {
                statusCode,
                error: HttpStatusMap.getDescriptionFromHttpStatusCode(statusCode),
                message: e.message || "Unknown error"
            }
        }

        const internalErrorRes: InternalErrorRes = e instanceof HttpException ? e.getResponse() as InternalErrorRes : nonHttpInternalErrorRes

        res.code(internalErrorRes.statusCode)
            .send(
                {
                    ...internalErrorRes,
                    timestamp: new Date().toISOString(),
                    path: req.url,
                    requestId: req.id
                }
            )

    }

}