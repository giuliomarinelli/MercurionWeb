import { Component, signal } from '@angular/core';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { AppShellFacade } from './app-shell.facade';
import { AuthStateStore } from './auth-state.store';
import { SessionSyncService } from './session-sync.service';
import { ScrollContextService } from './context/scroll-context.service';

@Component({ template: '' })
class PublicTestPage {}

describe('Public navigation with incomplete MFA', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = '__logged_in=; Max-Age=0; path=/';
    document.cookie = '__logged_in_=; Max-Age=0; path=/';
    TestBed.configureTestingModule({
      providers: [
        provideRouter(['', 'welcome', 'login', 'register', 'dashboard'].map(path => ({
          path, component: PublicTestPage,
          data: { routePolicy: { access: path === 'dashboard' ? 'authenticated' : path === '' ? 'public' : 'logged-out-only', shell: 'standard' } },
        }))),
        { provide: SessionSyncService, useValue: { handshakeTick: signal(0), status: signal('anonymous'), checkSession: async () => undefined } },
        { provide: ScrollContextService, useValue: { smoothToTop: () => undefined } },
      ],
    });
  });
  afterEach(() => {
    localStorage.clear();
    document.cookie = '__logged_in=; Max-Age=0; path=/';
    document.cookie = '__logged_in_=; Max-Age=0; path=/';
  });

  for (const reload of [false, true]) {
    it(`keeps public routes accessible after abandoned MFA ${reload ? 'on reload' : 'in the same tab'}`, async () => {
      if (reload) {
        document.cookie = '__logged_in=pending_long; path=/';
        document.cookie = '__logged_in_=true; path=/';
        localStorage.setItem('login', 'STALE');
      }
      TestBed.inject(AppShellFacade);
      const auth = TestBed.inject(AuthStateStore);
      if (!reload) {
        auth.beginAuthentication();
        auth.enterPreAuthentication('pat');
        document.cookie = '__logged_in=pending_short; path=/';
      }
      const router = TestBed.inject(Router);
      const destinations: string[] = [];
      router.events.subscribe(event => {
        if (event instanceof NavigationEnd) destinations.push(event.urlAfterRedirects);
      });
      for (const path of ['/', '/welcome', '/login', '/register']) {
        await router.navigateByUrl(path);
        TestBed.flushEffects();
        await TestBed.inject(ApplicationRef).whenStable();
        expect(router.url).toBe(path);
        expect(auth.authenticated()).toBeFalse();
      }
      expect(destinations).not.toContain('/dashboard');
    });
  }
});
