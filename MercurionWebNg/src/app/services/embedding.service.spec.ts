import { TestBed } from '@angular/core/testing';

import { EmbeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmbeddingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
