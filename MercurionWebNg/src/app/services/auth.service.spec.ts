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
});
