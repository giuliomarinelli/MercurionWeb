import { Injectable } from '@angular/core'
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http'
import { Observable, tap } from 'rxjs'

const CORRELATION_ID_HEADER = 'x-correlation-id'

function createCorrelationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

@Injectable()
export class CorrelationInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const correlationId = request.headers.get(CORRELATION_ID_HEADER) ?? createCorrelationId()
    return next.handle(request.clone({
      setHeaders: { [CORRELATION_ID_HEADER]: correlationId }
    })).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          const responseId = event.headers.get(CORRELATION_ID_HEADER)
          if (responseId && responseId !== correlationId) {
            // eslint-disable-next-line no-console
            console.warn('Correlation id changed across an HTTP response')
          }
        }
      })
    )
  }
}
