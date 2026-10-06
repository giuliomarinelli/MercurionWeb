import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionCardComponent } from './session-card.component';

describe('SessionCardComponent', () => {
  let component: SessionCardComponent;
  let fixture: ComponentFixture<SessionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SessionCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('session', {
      id: 'session-id.0123456789abcdef',
      createdAt: 0,
      expiresAt: 0,
      lastAccessedAt: 0,
      valid: true,
      current: true,
      location: 'Local',
      browser: 'Test',
      provider: 'Mercurion',
      triggerDisappear: signal(false),
      isBeingDeleted: false
    })
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the session identity and logout available while technical details are collapsed', () => {
    const card: HTMLElement = fixture.nativeElement;
    const details = card.querySelector('details');
    expect(details?.open).toBeFalse();
    expect(details?.querySelector('p')?.textContent).toContain('session-id');
    expect(card.querySelector('p')?.textContent).toContain('Test');
    const emitted = jasmine.createSpy('logout');
    component.onLoggingOutFromSession.subscribe(emitted);
    card.querySelector<HTMLButtonElement>('button[aria-label="Esci da questa sessione"]')?.click();
    expect(emitted).toHaveBeenCalledOnceWith('session-id.0123456789abcdef');
  });

  it('keeps the card visible with a spinner while logout is pending', () => {
    fixture.componentRef.setInput('session', { ...component.session(), isBeingDeleted: true });
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('[role="region"]');
    expect(card).not.toBeNull();
    expect(card.getAttribute('aria-busy')).toBe('true');
    expect(card.querySelector('m-progress-indicator')).not.toBeNull();
    expect(card.querySelector('button')).toBeNull();

    fixture.componentRef.setInput('session', { ...component.session(), isBeingDeleted: false });
    fixture.detectChanges();

    expect(card.getAttribute('aria-busy')).toBe('false');
    expect(card.querySelector('m-progress-indicator')).toBeNull();
    expect(card.querySelector('button[aria-label="Esci da questa sessione"]')).not.toBeNull();
  });
});
