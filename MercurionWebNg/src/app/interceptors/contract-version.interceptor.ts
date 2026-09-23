import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CONTRACT_VERSION_HEADER, CURRENT_CONTRACT_MAJOR } from '@mercurion/rest-contracts';

@Injectable()
export class ContractVersionInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (request.headers.has(CONTRACT_VERSION_HEADER)) return next.handle(request);

    return next.handle(request.clone({
      setHeaders: { [CONTRACT_VERSION_HEADER]: String(CURRENT_CONTRACT_MAJOR) }
    }));
  }
}
