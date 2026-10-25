import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { RealtimeStateSyncService } from './services/realtime-state-sync.service';
import { DOCUMENT } from '@angular/common';
import { ScrollContextService } from './services/context/scroll-context.service';
import { signal } from '@angular/core';
import { AuthStateStore } from './services/auth-state.store';
import { AppShellFacade } from './services/app-shell.facade';
import { DesignService } from './services/design.service';
import { SidenavContextService } from './services/context/sidenav-context.service';
import { ViewportRuntimeService } from './services/context/viewport-runtime.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        {
          provide: RealtimeStateSyncService,
          useValue: { start: jasmine.createSpy(), stop: jasmine.createSpy() }
        }
      ],
    }).compileComponents();
  });

  it('should create the application shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('registers the document as the application scroll root', () => {
    TestBed.createComponent(AppComponent);
    const doc = TestBed.inject(DOCUMENT);
    const scroll = TestBed.inject(ScrollContextService);
    expect(scroll.scrollRootRef()?.nativeElement).toBe(doc.scrollingElement as HTMLElement ?? doc.documentElement);
    expect(scroll.intersectionRoot()).toBeNull();
  });

  it('shares the desktop width between rail and content and retains collapse across responsive changes', () => {
    const authenticated = signal(true);
    const desktop = signal(true);
    TestBed.overrideProvider(AuthStateStore, { useValue: { authenticated } });
    TestBed.overrideProvider(AppShellFacade, { useValue: { routePolicy: signal({ shell: 'standard' }) } });
    TestBed.overrideProvider(DesignService, { useValue: { minBk: () => desktop } });
    const component = TestBed.createComponent(AppComponent).componentInstance;
    expect(component.navigationWidth()).toBe('256px');
    TestBed.inject(SidenavContextService).close();
    expect(component.navigationWidth()).toBe('64px');
    desktop.set(false);
    expect(component.navigationWidth()).toBe('0px');
    desktop.set(true);
    expect(component.navigationWidth()).toBe('64px');
    authenticated.set(false);
    expect(component.navigationWidth()).toBe('0px');
  });

  it('updates the shell gutter from the live viewport signal without a separate window resize notification', () => {
    const width = signal(375);
    TestBed.overrideProvider(ViewportRuntimeService, { useValue: { width } });
    TestBed.overrideProvider(AuthStateStore, { useValue: { authenticated: signal(true) } });
    TestBed.overrideProvider(AppShellFacade, { useValue: { routePolicy: signal({ shell: 'standard' }) } });
    const component = TestBed.createComponent(AppComponent).componentInstance;
    expect(component.navigationWidth()).toBe('0px');
    width.set(1366);
    expect(component.navigationWidth()).toBe('256px');
    TestBed.inject(SidenavContextService).close();
    expect(component.navigationWidth()).toBe('64px');
    width.set(375);
    expect(component.navigationWidth()).toBe('0px');
    width.set(1366);
    expect(component.navigationWidth()).toBe('64px');
  });
});
