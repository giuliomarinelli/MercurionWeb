import {
  Injectable,
  NgZone
} from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpErrorResponse,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service'; // Assumendo che sia il service dove gestisci il token
import { AuthStateStore } from '../services/auth-state.store';
import { isFatalUnauthenticatedBody } from './fatal-unauthenticated.util';
import { SessionInvalidationCause } from '@mercurion/rest-contracts'

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private readonly authService: AuthService,
    private readonly authState: AuthStateStore,
    private zone: NgZone
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const token = this.authService.getAccessToken()
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      tap(e => {
        if (e instanceof HttpResponse) {
          // 1️⃣ Controlla se c'è un nuovo token nell'header custom
          const newToken = e.headers.get('X-New-Access-Token')
          if (newToken) {
            this.authService.setAccessToken(newToken)
          }
        }
      }),
      catchError(err => {
        if (err instanceof HttpErrorResponse && err.status === 401 && isFatalUnauthenticatedBody(err.error)) {
          this.zone.run(() => this.authState.invalidate(SessionInvalidationCause.InvalidSession))
        }
        return throwError(() => err)
      })
    )
  }
}
