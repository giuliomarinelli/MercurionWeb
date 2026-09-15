import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { RpcException } from '@nestjs/microservices';
import { GqlContextType } from '@nestjs/graphql';
import { HttpErrorRes, InternalErrorRes } from 'src/Models/error-res.dto';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import {
    getApplicationError,
    getApplicationErrorMessage
} from './application-error';
import {
    createCorrelationId,
    createRestErrorResponse
} from './application-error-envelope';
import { getApplicationErrorDefinition, isApplicationErrorPayload } from '@mercurion/rest-contracts';
import { httpStatusDescription } from './http-status-description';

function errorMessage(value: unknown): string | undefined {
    return value instanceof Error
        ? value.message
        : typeof value === 'object' && value !== null && 'message' in value &&
          typeof value.message === 'string'
            ? value.message
            : undefined
}


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

    private readonly logger: MeiliContextLogger

    constructor(
        loggerFactory: MeiliLoggerService,
        private readonly isNotDev: boolean
    ) {
        this.logger = loggerFactory.forContext(HttpExceptionFilter.name)
    }

    catch(e: unknown, host: ArgumentsHost) {

        const ctxType = host.getType<GqlContextType>()

        if (ctxType === 'graphql' || ctxType === 'ws') return

        const httpCtx = host.switchToHttp()
        const req = httpCtx.getRequest<FastifyRequest>()
        const res = httpCtx.getResponse<FastifyReply>()

        let base: InternalErrorRes

        if (e instanceof RpcException) {
            base = this.handleRpcException(e)
        } else if (e instanceof HttpException) {
            base = this.handleHttpException(e)
        } else {
            this.logger.warn('Unhandled Internal Error', e as object)
            base = {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                error: httpStatusDescription(HttpStatus.INTERNAL_SERVER_ERROR),
                message: this.isNotDev ? 'Internal server error' : errorMessage(e) ?? 'Internal server error'
            }
        }

        const status = base.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;

        const headers = req.headers ?? {}
        const headerCorrelationId = headers['x-correlation-id'] ?? headers['x-request-id']
        const correlationId = createCorrelationId(headerCorrelationId ?? req.id)

        const response: HttpErrorRes = {
            ...createRestErrorResponse({
                ...base,
                status,
                correlationId,
                isProduction: this.isNotDev,
                path: req.url
            })
        }
        res.code(status).send(response)
    }

    private handleHttpException(e: HttpException): InternalErrorRes {

        const status = e.getStatus()
        const resp = e.getResponse()

        if (isApplicationErrorPayload(resp)) {
            const definition = getApplicationErrorDefinition(resp.code)
            return {
                statusCode: definition.httpStatus,
                error: httpStatusDescription(definition.httpStatus),
                code: resp.code,
                message: getApplicationErrorMessage(resp, this.isNotDev),
                details: resp.details
            }
        }

        if (typeof resp === 'string') {
            return {
                statusCode: status,
                error: httpStatusDescription(status),
                message: this.isNotDev && status >= 500 ? undefined : resp
            }
        }

        const r = resp as Partial<InternalErrorRes>

        return {
            statusCode: r.statusCode ?? status,
            error: r.error ?? httpStatusDescription(r.statusCode ?? status),
            // per i 4xx => in prod si può lasciare il messaggio (di solito è di dominio)
            // per i 5xx verrà comunque sovrascritto a livello chiamante se isProd
            message: r.message,
            details: r.details
        }
    }

    private handleRpcException(e: RpcException): InternalErrorRes {

        const applicationError = getApplicationError(e)
        if (applicationError) {
            const definition = getApplicationErrorDefinition(applicationError.code)
            return {
                statusCode: definition.httpStatus,
                error: httpStatusDescription(definition.httpStatus),
                code: applicationError.code,
                message: getApplicationErrorMessage(applicationError, this.isNotDev),
                details: applicationError.details
            }
        }

        const statusCode = HttpStatus.INTERNAL_SERVER_ERROR

        return {
            statusCode,
            error: httpStatusDescription(statusCode),
            code: 'INTERNAL_SERVER_ERROR',
            message: undefined
        }
    }
}
