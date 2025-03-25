import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyReply, FastifyRequest } from 'fastify';
import { SecureCookieService } from '../services/secure-cookie.service';

@Injectable()
export class GlobalInterceptor implements NestInterceptor {

  constructor(private readonly secureCookieService: SecureCookieService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    
    // const httpContext = context.switchToHttp();
    // const req = httpContext.getRequest<FastifyRequest>()
    // const res = httpContext.getResponse<FastifyReply>()

    // let deviceId: string | null = null;

    // try {
    //   // 🔹 Legge il deviceId dal cookie firmato
    //   deviceId = this.secureCookieService.getSignedCookie(req, '__device_id')
    // } catch {
    //   // 🔹 Se il cookie non esiste o è invalido, ne genera uno nuovo
    //   deviceId = crypto.randomUUID();
    //   this.secureCookieService.setSignedCookie(res, '__device_id', deviceId)
    // }

    // // 🔹 Inietta il deviceId validato nella richiesta come header
    // req.headers['x-device-id'] = deviceId

    return next.handle();
  }
}
