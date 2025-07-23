import { TestBed } from '@angular/core/testing';

import { MercurionAiService } from './mercurion-ai.service';

describe('MercurionAiService', () => {
  let service: MercurionAiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MercurionAiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
