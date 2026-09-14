import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthRedirectService } from './auth-redirect.service';

describe('AuthRedirectService', () => {
  let service: AuthRedirectService;

  beforeEach(() => {
    sessionStorage.clear()
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(AuthRedirectService);
  });

  afterEach(() => sessionStorage.clear())

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('round-trips a same-origin path, query and fragment exactly once', () => {
    expect(service.capture('/molecules/editor?x=1#atom')).toBe('/molecules/editor?x=1#atom')
    expect(service.peek()).toBe('/molecules/editor?x=1#atom')
    expect(service.consume()).toBe('/molecules/editor?x=1#atom')
    expect(service.consume()).toBe('/dashboard')
  })

  it('rejects external, protocol-relative, encoded and auth-loop targets', () => {
    for (const value of [
      'https://evil.example/',
      '//evil.example/path',
      '/\\evil.example',
      '/%2f%2fevil.example',
      '/%ZZ',
      '/login',
      '/login/mfa/EMAIL_OTP'
    ]) {
      expect(service.capture(value)).toBeNull()
      expect(service.peek()).toBeNull()
    }
  })

  it('invalidates stale persisted values before they can replay', () => {
    sessionStorage.setItem('authRedirectIntent', '//evil.example')
    expect(service.consume()).toBe('/dashboard')
    expect(sessionStorage.getItem('authRedirectIntent')).toBeNull()
  })
});
