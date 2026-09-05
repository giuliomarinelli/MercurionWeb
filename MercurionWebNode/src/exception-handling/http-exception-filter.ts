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
import { HttpErrorRes, InternalErrorRes } from 'src/Models/error-res.dto';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { randomBytes } from 'node:crypto';
import {
    getApplicationError,
    getApplicationErrorMessage
} from './application-error';
import { getApplicationErrorDefinition, isApplicationErrorPayload } from '@mercurion/rest-contracts';


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

    private readonly logger: MeiliContextLogger

    constructor(loggerFactory: MeiliLoggerService) {
        this.logger = loggerFactory.forContext(HttpExceptionFilter.name)
    }

    private readonly isNotDev = (process.env.APP_ENV ?? 'development') !== 'development'

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
                error: HttpStatusMap.getDescriptionFromHttpStatusCode(HttpStatus.INTERNAL_SERVER_ERROR,),
                message: (this.isNotDev ? 'Internal server error' : (e as any).message ?? 'Internal server error') as string
            }
        }

        const status = base.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;

        // in prod, per tutti i 5xx => messaggio generico
        const safeBase: InternalErrorRes = this.isNotDev && status >= 500
            ? {
                statusCode: status,
                error: base.error ?? HttpStatusMap.getDescriptionFromHttpStatusCode(status),
                code: base.code,
                message: 'Internal Server Error'
            }
            : base

        const reqIdSuffix = randomBytes(16).toString('hex')

        const response: HttpErrorRes = {
            ...safeBase,
            timestamp: new Date().toISOString(),
            path: req.url,
            requestId: `${req.id}-${reqIdSuffix}`
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
                error: HttpStatusMap.getDescriptionFromHttpStatusCode(definition.httpStatus),
                code: resp.code,
                message: getApplicationErrorMessage(resp, this.isNotDev)
            }
        }

        if (typeof resp === 'string') {
            return {
                statusCode: status,
                error: HttpStatusMap.getDescriptionFromHttpStatusCode(status),
                message: this.isNotDev && status >= 500 ? undefined : resp
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

        const applicationError = getApplicationError(e)
        if (applicationError) {
            const definition = getApplicationErrorDefinition(applicationError.code)
            return {
                statusCode: definition.httpStatus,
                error: HttpStatusMap.getDescriptionFromHttpStatusCode(definition.httpStatus),
                code: applicationError.code,
                message: getApplicationErrorMessage(applicationError, this.isNotDev)
            }
        }

        const raw = e.getError();
        const message = (typeof raw === 'string' ? raw : (raw as any)?.message ?? e.message) as string
        const statusCode = HttpStatus.INTERNAL_SERVER_ERROR

        return {
            statusCode,
            error: HttpStatusMap.getDescriptionFromHttpStatusCode(statusCode),
            message
        }
    }
}
