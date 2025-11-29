import { TestBed } from '@angular/core/testing';

import { ProfileRegistryEditContextService } from './profile-registry-edit-context.service';

describe('ProfileRegistryEditContextService', () => {
  let service: ProfileRegistryEditContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfileRegistryEditContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
