import { TestBed } from '@angular/core/testing';

import { AuthFallbackInterceptor } from './auth-fallback.interceptor';

describe('AuthFallbackInterceptor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [
      AuthFallbackInterceptor
      ]
  }));

  it('should be created', () => {
    const interceptor: AuthFallbackInterceptor = TestBed.inject(AuthFallbackInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
