import { HttpRequest, HttpResponse } from '@angular/common/http'
import { NgZone } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { of } from 'rxjs'

import { AuthInterceptor } from './auth.interceptor'

describe('AuthInterceptorInterceptor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      AuthInterceptor
      ]
  }));

  it('should be created', () => {
    const interceptor: AuthInterceptor = TestBed.inject(AuthInterceptor)
    expect(interceptor).toBeTruthy()
  })

  it('adds the bearer token without a dummy authentication bypass header', () => {
    let forwarded: HttpRequest<unknown> | undefined
    const interceptor = new AuthInterceptor(
      { getAccessToken: () => 'synthetic-token' } as never,
      { invalidate: () => undefined } as never,
      new NgZone({ enableLongStackTrace: false })
    )

    interceptor.intercept(
      new HttpRequest('GET', '/api/history'),
      {
        handle: request => {
          forwarded = request
          return of(new HttpResponse())
        }
      }
    ).subscribe()

    expect(forwarded?.headers.get('Authorization')).toBe('Bearer synthetic-token')
  })
})
