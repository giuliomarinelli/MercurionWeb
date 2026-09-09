import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { JwtHelperService } from './jwt-helper.service';
import { TypeGuardsService } from './type-guards.service';
import { UserContextService } from './context/user-context.service';
import { Router } from '@angular/router';
import { AuthStateStore } from './auth-state.store';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: JwtHelperService,
          useValue: { getClaim: () => null, isTokenExpired: () => false },
        },
        { provide: TypeGuardsService, useValue: { isNotNullish: () => false } },
        { provide: UserContextService, useValue: { logout: () => undefined } },
        { provide: Router, useValue: { navigateByUrl: () => Promise.resolve(true) } },
      ],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('does not send X-Mock-IP with the first login request', () => {
    service.login_firstStep({
      email: 'user@example.test',
      password: 'password',
      remember: false,
      fingerprintBase64: 'fingerprint',
      sessionDeviceInfo: { browser: {} },
      turnstileToken: 'challenge-token',
    }).subscribe();

    const request = httpTesting.expectOne('/api/authentication/login/1');

    expect(request.request.headers.get('X-Fingerprint')).toBe('fingerprint');
    expect(request.request.headers.get('X-Challenge-Token')).toBe('challenge-token');
    expect(request.request.headers.has('X-Mock-IP')).toBeFalse();
    request.flush({});
  });

  it('does not send X-Mock-IP with the final MFA request', () => {
    service.login_thirdStep(
      'EMAIL_OTP',
      { code: '123456' },
      {
        fingerprintBase64: 'fingerprint',
        sessionDeviceInfo: { browser: {} },
      },
      'preauthorization-token',
    ).subscribe();

    const request = httpTesting.expectOne('/api/authentication/login/EMAIL_OTP/3');

    expect(request.request.headers.get('X-Fingerprint')).toBe('fingerprint');
    expect(request.request.headers.has('Authorization')).toBeTrue();
    expect(request.request.headers.has('X-Mock-IP')).toBeFalse();
    request.flush({});
  });

  it('performs one local transition and one HTTP request for concurrent logout calls', () => {
    const authState = TestBed.inject(AuthStateStore);
    const logoutSpy = spyOn(authState, 'logout').and.callThrough();

    service.logout().subscribe();
    service.logout().subscribe();

    const requests = httpTesting.match('/api/authentication/logout');
    expect(requests).toHaveSize(1);
    expect(logoutSpy).toHaveBeenCalledTimes(1);
    requests[0].flush(null);
  });

  it('keeps the client anonymous when logout fails with a network error', () => {
    const authState = TestBed.inject(AuthStateStore);
    let failed = false;

    service.logout().subscribe({ error: () => { failed = true }});
    const request = httpTesting.expectOne('/api/authentication/logout');
    request.error(new ProgressEvent('network'));

    expect(failed).toBeTrue();
    expect(authState.state().kind).toBe('anonymous');
  });

  it('does not issue a second revocation after a rejected logout response', () => {
    service.logout().subscribe({ error: () => undefined });
    const request = httpTesting.expectOne('/api/authentication/logout');
    request.flush({ message: 'rejected' }, { status: 503, statusText: 'Rejected' });

    service.logout().subscribe();
    httpTesting.expectNone('/api/authentication/logout');
  });
});
