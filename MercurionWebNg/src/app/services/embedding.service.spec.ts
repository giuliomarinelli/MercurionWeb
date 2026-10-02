import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'

import { EmbeddingService } from './embedding.service'

describe('EmbeddingService', () => {
  let service: EmbeddingService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })

    service = TestBed.inject(EmbeddingService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('requests similar molecules from a canonical SMILES seed', () => {
    service.getSimilarBySmiles('CCO', 3, false, true).subscribe()

    const request = http.expectOne(
      '/api/embedding/get-similar-by-smiles?n=3&with_no_name=false&only_molregnos=true'
    )

    expect(request.request.method).toBe('POST')
    expect(request.request.body).toEqual({ smiles: 'CCO' })
    expect(request.request.withCredentials).toBeTrue()

    request.flush([1, 2, 3])
  })
})
