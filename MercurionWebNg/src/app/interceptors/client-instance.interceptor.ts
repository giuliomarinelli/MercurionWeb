import { Injectable } from '@angular/core'
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http'
import { Observable } from 'rxjs'
import { CLIENT_INSTANCE_ID_HEADER } from '@mercurion/rest-contracts'
import { ClientInstanceIdService } from '../services/client-instance-id.service'

@Injectable()
export class ClientInstanceInterceptor implements HttpInterceptor {
  constructor(private readonly clientInstance: ClientInstanceIdService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!request.url.startsWith('/api/')) return next.handle(request)

    return next.handle(request.clone({
      setHeaders: {
        [CLIENT_INSTANCE_ID_HEADER]: this.clientInstance.get()
      }
    }))
  }
}
