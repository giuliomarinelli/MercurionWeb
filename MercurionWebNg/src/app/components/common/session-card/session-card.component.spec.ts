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
    component.session = {
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
    }
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
