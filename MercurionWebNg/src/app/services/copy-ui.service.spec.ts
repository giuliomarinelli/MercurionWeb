import { TestBed } from '@angular/core/testing';

import { CopyUiService } from './copy-ui.service';

describe('CopyUiService', () => {
  let service: CopyUiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CopyUiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
