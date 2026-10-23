import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routeManifest } from '../../../route-manifest';
import { InAppNotificationService } from '../../../services/in-app-notification.service';
import { RealtimeSyncStatusService } from '../../../services/realtime-sync-status.service';
import { HeaderNotificationsComponent } from './header-notifications.component';

describe('HeaderNotificationsComponent', () => {
  const unreadCount = signal(3);
  const catchUpCount = signal(0);
  const synchronized = signal(false);
  let dismissCatchUp: jasmine.Spy;
  let acknowledgeCatchUpPresented: jasmine.Spy;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    unreadCount.set(3);
    catchUpCount.set(0);
    synchronized.set(false);
    dismissCatchUp = jasmine.createSpy('dismissCatchUp');
    acknowledgeCatchUpPresented = jasmine.createSpy('acknowledgeCatchUpPresented').and.resolveTo();
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [HeaderNotificationsComponent],
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: RealtimeSyncStatusService, useValue: { visible: synchronized } },
        {
          provide: InAppNotificationService,
          useValue: { unreadCount, catchUpCount, dismissCatchUp, acknowledgeCatchUpPresented }
        }
      ]
    });
  });

  it('shows the unread count and opens notifications from the bell', () => {
    const fixture = TestBed.createComponent(HeaderNotificationsComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('m-notification-button button') as HTMLButtonElement;
    expect(button.textContent).toContain('3');
    button.click();
    expect(dismissCatchUp).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith([routeManifest.notifications.build({})]);
  });

  it('leaves one flex gap between controls when the sync badge has no content', () => {
    const fixture = TestBed.createComponent(HeaderNotificationsComponent);
    fixture.detectChanges();
    const group = document.createElement('div');
    group.style.cssText = 'display:flex;align-items:center;gap:8px';
    const search = document.createElement('button');
    const theme = document.createElement('button');
    search.style.cssText = theme.style.cssText = 'width:40px;height:40px';
    group.append(search, fixture.nativeElement, theme);
    document.body.appendChild(group);
    try {
      const bell = group.querySelector('m-notification-button button')!;
      expect(bell.getBoundingClientRect().left - search.getBoundingClientRect().right).toBeCloseTo(8, 1);
      expect(theme.getBoundingClientRect().left - bell.getBoundingClientRect().right).toBeCloseTo(8, 1);
      synchronized.set(true);
      fixture.detectChanges();
      expect(group.querySelector('[role="status"]')).not.toBeNull();
      expect(theme.getBoundingClientRect().left - bell.getBoundingClientRect().right).toBeCloseTo(8, 1);
    } finally {
      fixture.destroy();
      group.remove();
    }
  });

  it('acknowledges catch-up only after it is rendered and allows dismissing it', () => {
    const fixture = TestBed.createComponent(HeaderNotificationsComponent);
    fixture.detectChanges();
    expect(acknowledgeCatchUpPresented).not.toHaveBeenCalled();
    catchUpCount.set(2);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Hai 2 nuove notifiche');
    expect(acknowledgeCatchUpPresented).toHaveBeenCalledTimes(1);
    const close = fixture.nativeElement.querySelector('m-notification-catch-up button:last-child') as HTMLButtonElement;
    close.click();
    expect(dismissCatchUp).toHaveBeenCalled();
  });
});
