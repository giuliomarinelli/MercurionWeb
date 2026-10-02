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

    const request = http.expectOne(req =>
      req.method === 'POST' &&
      req.url === '/api/embedding/get-similar-by-smiles'
    )

    expect(request.request.body).toEqual({ smiles: 'CCO' })
    expect(request.request.params.get('n')).toBe('3')
    expect(request.request.params.get('with_no_name')).toBe('false')
    expect(request.request.params.get('only_molregnos')).toBe('true')
    expect(request.request.withCredentials).toBeTrue()

    request.flush([1, 2, 3])
  })
})
