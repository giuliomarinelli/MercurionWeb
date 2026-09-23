import { HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { CONTRACT_VERSION_HEADER, CURRENT_CONTRACT_MAJOR } from '@mercurion/rest-contracts';
import { ContractVersionInterceptor } from './contract-version.interceptor';

describe('ContractVersionInterceptor', () => {
  it('adds the current contract major to HTTP requests', () => {
    const next = jasmine.createSpyObj<HttpHandler>('HttpHandler', ['handle']);
    next.handle.and.returnValue(of(new HttpResponse()));

    new ContractVersionInterceptor().intercept(new HttpRequest('GET', '/api/health'), next).subscribe();

    expect(next.handle.calls.mostRecent().args[0].headers.get(CONTRACT_VERSION_HEADER))
      .toBe(String(CURRENT_CONTRACT_MAJOR));
  });

  it('preserves an explicitly selected contract major', () => {
    const next = jasmine.createSpyObj<HttpHandler>('HttpHandler', ['handle']);
    next.handle.and.returnValue(of(new HttpResponse()));
    const request = new HttpRequest('GET', '/api/health', {
      headers: { [CONTRACT_VERSION_HEADER]: '99' }
    });

    new ContractVersionInterceptor().intercept(request, next).subscribe();

    expect(next.handle.calls.mostRecent().args[0]).toBe(request);
  });
});
