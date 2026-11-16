import {
  HttpErrorResponse,
  HttpHeaders,
  HttpRequest,
  HttpResponse
} from '@angular/common/http'
import { NgZone } from '@angular/core'
import { of, throwError } from 'rxjs'
import { ApplicationErrorCode } from '../utils/application-error.util'
import { AuthInterceptor } from './auth.interceptor'

describe('AuthInterceptor', () => {
  function createInterceptor() {
    const authService = {
      getAccessToken: () => 'synthetic-token'
    }
    const authState = {
      invalidate: jasmine.createSpy('invalidate'),
      rotateAccessToken: jasmine.createSpy('rotateAccessToken')
    }
    const interceptor = new AuthInterceptor(
      authService as never,
      authState as never,
      new NgZone({ enableLongStackTrace: false })
    )
    return { interceptor, authService, authState }
  }

  it('attaches the bearer token and does not add the deprecated dummy-auth header', () => {
    const { interceptor } = createInterceptor()
    let forwarded: HttpRequest<unknown> | undefined

    interceptor.intercept(
      new HttpRequest('GET', '/api/history'),
      {
        handle: request => {
          forwarded = request
          return of(new HttpResponse())
        }
      }
    ).subscribe()

    expect(forwarded?.headers.get('Authorization')).toBeTruthy()
    expect(forwarded?.headers.has('X-Dummy-Auth')).toBeFalse()
  })

  it('invalidates exactly once for a fatal REST 401', () => {
    const { interceptor, authState } = createInterceptor()
    const error = new HttpErrorResponse({
      status: 401,
      error: { code: ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_FATAL }
    })

    interceptor.intercept(
      new HttpRequest('GET', '/api/protected'),
      { handle: () => throwError(() => error) }
    ).subscribe({ error: () => undefined })

    expect(authState.invalidate).toHaveBeenCalledTimes(1)
  })

  it('invalidates exactly once for a fatal GraphQL 200 response', () => {
    const { interceptor, authState } = createInterceptor()
    const response = new HttpResponse({
      status: 200,
      body: { errors: [{ extensions: { code: ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_FATAL } }] }
    })

    interceptor.intercept(
      new HttpRequest('POST' as any, '/api/graphql'),
      { handle: () => of(response) }
    ).subscribe()

    expect(authState.invalidate).toHaveBeenCalledTimes(1)
  })

  it('rotates the canonical access token exactly once', () => {
    const { interceptor, authState } = createInterceptor()
    const response = new HttpResponse({
      headers: new HttpHeaders({ 'X-New-Access-Token': 'rotated-token' })
    })

    interceptor.intercept(
      new HttpRequest('GET', '/api/protected'),
      { handle: () => of(response) }
    ).subscribe()

    expect(authState.rotateAccessToken).toHaveBeenCalledOnceWith('rotated-token')
    expect(authState.invalidate).not.toHaveBeenCalled()
  })

  it('passes ordinary errors through without auth side effects', () => {
    const { interceptor, authState } = createInterceptor()
    const error = new HttpErrorResponse({ status: 500, error: { message: 'failure' } })
    let received: unknown

    interceptor.intercept(
      new HttpRequest('GET', '/api/ordinary'),
      { handle: () => throwError(() => error) }
    ).subscribe({ error: value => { received = value } })

    expect(received).toBe(error)
    expect(authState.invalidate).not.toHaveBeenCalled()
  })
})
