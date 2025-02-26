import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { HttpErrorRes, InternalErrorRes } from "src/Models/error-res.dto";
import { FastifyRequest, FastifyReply } from 'fastify'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

    catch(e: any, host: ArgumentsHost) {

        const req = host.switchToHttp().getRequest<FastifyRequest>()
        const res = host.switchToHttp().getResponse<FastifyReply>()

        const internalErrorRes: InternalErrorRes = e instanceof HttpException ? e.getResponse() as InternalErrorRes : {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: "Internal Server Error",
            message: "Unknown error"
        }

        res.status(internalErrorRes.statusCode)
            .send({
                ...internalErrorRes,
                timestamp: new Date().toISOString(),
                path: req.url,
                requestId: req.id
            } as HttpErrorRes)
    }

}