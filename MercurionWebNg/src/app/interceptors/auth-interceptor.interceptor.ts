import {
  Injectable,
  NgZone
} from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserContextService } from '../services/stores/user-context.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private readonly userContext: UserContextService,
    private zone: NgZone
  ) { }

 intercept(req: HttpRequest<any>, next: HttpHandler) {
  return next.handle(req).pipe(
    catchError(err => {
      if (err.status === 401) {
        this.zone.run(() => this.userContext.clearInitials());
      }
      return throwError(() => err);
    })
  );
}



}
