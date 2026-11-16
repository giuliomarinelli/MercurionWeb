import {
  HttpErrorResponse,
  HttpRequest,
  HttpResponse
} from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { of, throwError } from 'rxjs'
import { ApplicationErrorCode } from '../utils/application-error.util'
import { AuthFallbackInterceptor } from './auth-fallback.interceptor'

describe('AuthFallbackInterceptor', () => {
  const router = { navigateByUrl: jasmine.createSpy('navigateByUrl') }

  beforeEach(() => {
    router.navigateByUrl.calls.reset()
    TestBed.configureTestingModule({
      providers: [
        AuthFallbackInterceptor,
        { provide: Router, useValue: router }
      ]
    })
  })

  it('owns forbidden navigation without invalidating the session', () => {
    const interceptor = TestBed.inject(AuthFallbackInterceptor)
    const error = new HttpErrorResponse({
      status: 403,
      error: { code: ApplicationErrorCode.PERMISSION_DENIED }
    })

    interceptor.intercept(
      new HttpRequest('GET', '/api/protected'),
      { handle: () => throwError(() => error) }
    ).subscribe({ error: () => undefined })

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/403-forbidden')
  })

  it('does not handle fatal GraphQL responses or ordinary errors', () => {
    const interceptor = TestBed.inject(AuthFallbackInterceptor)
    const fatalResponse = new HttpResponse({
      status: 200,
      body: { errors: [{ extensions: { code: ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_FATAL } }] }
    })

    interceptor.intercept(
      new HttpRequest('POST' as any, '/api/graphql'),
      { handle: () => of(fatalResponse) }
    ).subscribe()

    expect(router.navigateByUrl).not.toHaveBeenCalled()
  })
})
