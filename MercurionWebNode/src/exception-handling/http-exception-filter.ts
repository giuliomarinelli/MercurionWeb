import {
    ArgumentsHost, Catch, ExceptionFilter
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { GqlContextType } from '@nestjs/graphql';
import { HttpErrorRes } from 'src/Models/error-res.dto';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import {
    createCorrelationId,
    createRestErrorResponse,
    presentApplicationError
} from './application-error-envelope';


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

        const headers = req.headers ?? {}
        const headerCorrelationId = headers['x-correlation-id'] ?? headers['x-request-id']
        const correlationId = createCorrelationId(headerCorrelationId ?? req.id)
        const presentation = presentApplicationError(e, {
            correlationId,
            isProduction: this.isNotDev
        })
        if (presentation.category === 'internal' && presentation.diagnosticCause) {
            this.logger.warn('Unhandled Internal Error', presentation.diagnosticCause as object)
        }

        const response: HttpErrorRes = {
            ...createRestErrorResponse({
                ...presentation,
                correlationId,
                isProduction: this.isNotDev,
                path: req.url
            })
        }
        res.code(presentation.status).send(response)
    }
}
