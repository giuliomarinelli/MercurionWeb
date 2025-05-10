import { TestBed } from '@angular/core/testing';

import { SidenavContextService } from './sidenav-context.service';

describe('SidenavContextService', () => {
  let service: SidenavContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidenavContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
