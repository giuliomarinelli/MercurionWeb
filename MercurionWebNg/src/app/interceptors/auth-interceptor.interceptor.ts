import {
  Injectable,
  NgZone
} from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { UserContextService } from '../services/stores/user-context.service';
import { AuthService } from '../services/auth.service'; // Assumendo che sia il service dove gestisci il token

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private readonly userContext: UserContextService,
    private readonly authService: AuthService,
    private zone: NgZone
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Prendi il token corrente e aggiungilo alla richiesta
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
            console.log(`Refresh => nuovo access token: ${newToken}`)
          }
        }
      }),
      catchError(err => {
        if (err.status === 401) {
          this.zone.run(() => this.userContext.clearInitials())
        }
        return throwError(() => err)
      })
    )
  }
}
