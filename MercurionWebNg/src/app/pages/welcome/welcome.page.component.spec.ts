import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthStateStore } from '../../services/auth-state.store';
import { SessionSyncService } from '../../services/session-sync.service';

import { WelcomePageComponent } from './welcome.page.component';

describe('WelcomePageComponent', () => {
  const kind = signal<'bootstrap' | 'authenticating' | 'anonymous' | 'authenticated' | 'pre-auth'>('bootstrap');
  const authenticated = signal(false);
  const status = signal<'unknown' | 'checking' | 'anonymous' | 'loggedIn'>('unknown');
  let component: WelcomePageComponent;
  let fixture: ComponentFixture<WelcomePageComponent>;

  beforeEach(async () => {
    kind.set('bootstrap');
    authenticated.set(false);
    status.set('unknown');
    await TestBed.configureTestingModule({
      imports: [WelcomePageComponent],
      providers: [
        { provide: AuthStateStore, useValue: { kind, authenticated } },
        { provide: SessionSyncService, useValue: { status } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WelcomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the centered spinner during session restoration', () => {
    kind.set('authenticating');
    status.set('checking');
    fixture.detectChanges();

    const pending = fixture.nativeElement.querySelector('.mercurion-welcome-pending') as HTMLElement;
    expect(pending.querySelector('m-progress-indicator')).not.toBeNull();
    const bounds = pending.getBoundingClientRect();
    expect(Math.abs(bounds.left + bounds.width / 2 - window.innerWidth / 2)).toBeLessThan(1);
    expect(Math.abs(bounds.top + bounds.height / 2 - window.innerHeight / 2)).toBeLessThan(1);
    expect(fixture.nativeElement.querySelector('m-welcome-hero')).toBeNull();
  });

  it('shows anonymous content only after an anonymous session is established', () => {
    kind.set('anonymous');
    status.set('anonymous');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('m-welcome-hero')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.mercurion-welcome-pending')).toBeNull();
  });

  it('shows public content after leaving an incomplete MFA login', () => {
    kind.set('pre-auth');
    status.set('anonymous');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('m-welcome-hero')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.mercurion-welcome-pending')).toBeNull();
  });

  it('keeps the spinner visible for an authenticated user until navigation', () => {
    kind.set('authenticated');
    authenticated.set(true);
    status.set('loggedIn');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.mercurion-welcome-pending m-progress-indicator')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('m-welcome-hero')).toBeNull();
  });
});
