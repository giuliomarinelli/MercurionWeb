import { TestBed } from '@angular/core/testing';

import { UserScopeService } from './user-scope.service';

describe('UserScopeService', () => {
  let service: UserScopeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserScopeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
