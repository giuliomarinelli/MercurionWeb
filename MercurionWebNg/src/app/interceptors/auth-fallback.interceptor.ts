import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { classifyAuthResponse } from './auth-error.util';

@Injectable()
export class AuthFallbackInterceptor implements HttpInterceptor {

  private readonly router = inject(Router)

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

    return next.handle(req).pipe(
      catchError((e: unknown) => {
        if (e instanceof HttpErrorResponse) {
          const authEvent = classifyAuthResponse(e)
          if (authEvent.kind === 'forbidden') {
            this.router.navigateByUrl('/403-forbidden')
          }
        }

        return throwError(() => e)
      }),
    );
  }
}
