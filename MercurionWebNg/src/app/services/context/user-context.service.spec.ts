import { TestBed } from '@angular/core/testing';
import { AuthStateStore, type AuthState } from '../auth-state.store';
import { computed, signal } from '@angular/core';

import { UserContextService } from './user-context.service';

describe('UserContextService', () => {
  let service: UserContextService;
  const state = signal<AuthState>({ kind: 'bootstrap' });

  beforeEach(() => {
    state.set({ kind: 'bootstrap' });
    TestBed.configureTestingModule({
      providers: [{ provide: AuthStateStore, useValue: {
        state,
        authenticated: computed(() => state().kind === 'authenticated'),
        initials: signal('')
      } }]
    });
    service = TestBed.inject(UserContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('distinguishes restoration from anonymous and password authentication states', () => {
    const cases: [AuthState, boolean][] = [
      [{ kind: 'bootstrap' }, true],
      [{ kind: 'authenticating', flow: 'restore' }, true],
      [{ kind: 'anonymous' }, false],
      [{ kind: 'authenticating', flow: 'password' }, false],
      [{ kind: 'authenticating', flow: 'sso' }, false],
      [{ kind: 'session-expired' }, false]
    ];
    for (const [snapshot, expected] of cases) {
      state.set(snapshot);
      expect(service.isRestoringSession()).toBe(expected);
    }
  });
});
