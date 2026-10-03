import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PcpApiService } from './pcp-api.service';

describe('PcpApiService', () => {
  let service: PcpApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PcpApiService);
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('posts the canonical request and reads the IUPAC name as text', () => {
    let name: string | undefined;
    service.getIupacNameFromSmiles('CCO').subscribe(result => { name = result; });
    const request = TestBed.inject(HttpTestingController).expectOne('/api/pcp-api/get-iupac-name-from-smiles');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ smiles: 'CCO' });
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.responseType).toBe('text');
    request.flush('ethanol');
    expect(name).toBe('ethanol');
  });
});
