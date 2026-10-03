import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ProvidedAccountIdDTO } from '@mercurion/rest-contracts';
import { HeaderFacade } from './header.facade';
import { AccountService } from '../../../services/account.service';
import { AuthStateStore } from '../../../services/auth-state.store';
import { UserContextService } from '../../../services/context/user-context.service';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';

describe('HeaderFacade reactive requests', () => {
  it('ignores cache updates and cancels the old account request on session changes', () => {
    const session = signal({ userId: 'user-1', sessionId: 'session-1' });
    const loggedIn = signal(true);
    const cache = signal<ProvidedAccountIdDTO | null>(null);
    const first = new Subject<ProvidedAccountIdDTO>();
    const second = new Subject<ProvidedAccountIdDTO>();
    const requests = [first, second];
    const getProvidedAccountId = jasmine.createSpy('getProvidedAccountId').and.callFake(() => {
      cache();
      return requests.shift() ?? second;
    });
    TestBed.configureTestingModule({ providers: [
      HeaderFacade,
      { provide: AccountService, useValue: { getProvidedAccountId } },
      { provide: AuthStateStore, useValue: { clientSession: session } },
      { provide: UserContextService, useValue: { isLoggedIn: loggedIn, initials: signal('G') } },
      { provide: ThemeManagerService, useValue: { theme: signal('dark') } }
    ] });
    TestBed.inject(HeaderFacade);
    TestBed.flushEffects();
    expect(first.observed).toBeTrue();
    cache.set({} as ProvidedAccountIdDTO);
    TestBed.flushEffects();
    expect(getProvidedAccountId).toHaveBeenCalledTimes(1);

    session.set({ userId: 'user-2', sessionId: 'session-2' });
    TestBed.flushEffects();
    expect(first.observed).toBeFalse();
    expect(second.observed).toBeTrue();
    expect(getProvidedAccountId).toHaveBeenCalledTimes(2);

    loggedIn.set(false);
    TestBed.flushEffects();
    expect(second.observed).toBeFalse();
  });
});
