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
import { UserContextService } from '../services/context/user-context.service';
import { AuthService } from '../services/auth.service'; // Assumendo che sia il service dove gestisci il token
import { isFatalUnauthenticatedBody } from './fatal-unauthenticated.util';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private readonly userContext: UserContextService,
    private readonly authService: AuthService,
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
            const scp = this.authService.getUserScopesFromClaims(newToken)
            if (scp && scp.length) {
              this.authService.setCachedScopes(scp)
            }
          }
        }
      }),
      catchError(err => {
        if (err instanceof HttpErrorResponse && err.status === 401 && isFatalUnauthenticatedBody(err.error)) {
          this.zone.run(() => this.userContext.clearInitials())
        }
        return throwError(() => err)
      })
    )
  }
}
