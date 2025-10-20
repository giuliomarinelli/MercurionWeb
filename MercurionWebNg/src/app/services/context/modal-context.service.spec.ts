import { TestBed } from '@angular/core/testing';

import { ModalContextService } from './modal-context.service';

describe('ModalContextService', () => {
  let service: ModalContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModalContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
