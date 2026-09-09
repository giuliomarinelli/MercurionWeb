import {
  Injectable,
  NgZone
} from '@angular/core';
import {
  HttpEvent,
  HttpErrorResponse,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service'; // Assumendo che sia il service dove gestisci il token
import { AuthStateStore } from '../services/auth-state.store';
import { classifyAuthResponse } from './auth-error.util';

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
      tap({
        next: event => {
          this.handleAuthEvent(event)
        },
        error: error => {
          this.handleAuthEvent(error)
        }
      })
    )
  }

  private handleAuthEvent(event: HttpEvent<unknown> | HttpErrorResponse): void {
    const authEvent = classifyAuthResponse(event)
    if (authEvent.kind === 'token-rotated') {
      this.authService.setAccessToken(authEvent.token)
    } else if (authEvent.kind === 'session-invalidated') {
      this.zone.run(() => this.authState.invalidate(authEvent.cause))
    }
  }
}
