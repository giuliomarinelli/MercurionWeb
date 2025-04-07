import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { HttpErrorRes, InternalErrorRes } from "src/Models/error-res.dto";
import { FastifyRequest, FastifyReply } from 'fastify'
import { RpcException } from "@nestjs/microservices";
import { HttpStatusMap } from "./http-status-map";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

    catch(e: any, host: ArgumentsHost) {

        const req = host.switchToHttp().getRequest<FastifyRequest>()
        const res = host.switchToHttp().getResponse<FastifyReply>()

        let nonHttpInternalErrorRes: InternalErrorRes = {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: "Internal Server Error",
            message: "Unknown error"
        }

        let status = HttpStatus.INTERNAL_SERVER_ERROR

        if (!(e instanceof HttpException) && e instanceof RpcException) {
            switch (e.message) {
                case 'UserRegistrationConflict::Email already exists':
                    status = HttpStatus.CONFLICT
                    nonHttpInternalErrorRes = new InternalErrorRes(
                        status, 
                        HttpStatusMap.getDescriptionFromHttpStatusCode(status), 
                        e.message || undefined
                    )
                break
                case 'AccountActivation::User not found':
                    status = HttpStatus.NOT_FOUND
                    nonHttpInternalErrorRes = new InternalErrorRes(
                        status,
                        HttpStatusMap.getDescriptionFromHttpStatusCode(status),
                        e.message || undefined
                    )
            }
        }

        const internalErrorRes: InternalErrorRes = e instanceof HttpException ? e.getResponse() as InternalErrorRes : nonHttpInternalErrorRes

        res.code(internalErrorRes.statusCode).send(
            {
                ...internalErrorRes,
                timestamp: new Date().toISOString(),
                path: req.url,
                requestId: req.id
            } as HttpErrorRes
        )

    }

}