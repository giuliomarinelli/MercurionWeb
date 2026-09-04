import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthStateStore } from '../services/auth-state.store';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { HttpErrorBody } from '../Models/http-error-body.dto';
import { isFatalUnauthenticatedBody } from './fatal-unauthenticated.util';
import {
  ApplicationErrorCode,
  hasApplicationErrorCode
} from '../utils/application-error.util';

@Injectable()
export class AuthFallbackInterceptor implements HttpInterceptor {

  private readonly authState = inject(AuthStateStore)
  private readonly toast = inject(ToastService)
  private readonly router = inject(Router)

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const forceLogout = () => {
      this.toast.trigger('Sessione scaduta o invalidata. Effettua di nuovo il login.', 'error')
      this.authState.invalidate('http-401')
      this.router.navigateByUrl('/login')
    }

    return next.handle(req).pipe(
      // 1) caso GraphQL che torna 200 ma con errors (se mai capitasse)
      tap((event) => {
        if (event instanceof HttpResponse) {
          if (isFatalUnauthenticatedBody(event.body)) {
            if (this.authState.isAuthenticated()) {
              forceLogout()
            }
          }
        }
      }),

      // 2) caso classico: 401, REST o GraphQL
      catchError((e: any) => {
        if (e instanceof HttpErrorResponse && e.status === 403) {
          const body = e.error as HttpErrorBody
          if (hasApplicationErrorCode(body, ApplicationErrorCode.PERMISSION_DENIED)) {
            this.router.navigateByUrl('/403-forbidden')
          }
        }
        if (e instanceof HttpErrorResponse && e.status === 401) {
          const body = e.error
          if (isFatalUnauthenticatedBody(body)) {
            if (this.authState.isAuthenticated()) {
              forceLogout()
            }
          }
        }

        return throwError(() => e)
      }),
    );
  }
}
