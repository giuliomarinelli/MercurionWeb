import { TestBed } from '@angular/core/testing';

import { RecoveryService } from './recovery.service';
import { AuthStateStore } from './auth-state.store';

describe('RecoveryService', () => {
  let service: RecoveryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecoveryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('delegates both recovery steps to the canonical safe-state transition', () => {
    const authState = TestBed.inject(AuthStateStore);
    const beginRecovery = spyOn(authState, 'beginRecovery');

    service.accountRecovery_firstStep('code', 'challenge');
    service.accountRecovery_secondStep('new@example.test', 'password', 'secure-token', 'challenge');

    expect(beginRecovery).toHaveBeenCalledTimes(2);
  });
});
