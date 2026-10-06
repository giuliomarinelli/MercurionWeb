import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { Router } from '@angular/router';

import { HeaderComponent } from './header.component';
import { UserContextService } from '../../../services/context/user-context.service';
import { AccountService } from '../../../services/account.service';
import { DesignService } from '../../../services/design.service';
import { InAppNotificationService } from '../../../services/in-app-notification.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        {
          provide: InAppNotificationService,
          useValue: {
            unreadCount: signal(0),
            catchUpCount: signal(0),
            dismissCatchUp: jasmine.createSpy(),
            acknowledgeCatchUpPresented: jasmine.createSpy()
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('aligns the theme menu right edge with its trigger', fakeAsync(() => {
    const trigger = fixture.nativeElement.querySelector('.theme-toggle-button') as HTMLElement;
    trigger.click();
    fixture.detectChanges();
    tick(0);
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector('.theme-menu-container.absolute') as HTMLElement;
    expect(menu).toBeTruthy();
    expect(Math.abs(menu.getBoundingClientRect().right - trigger.getBoundingClientRect().right)).toBeLessThan(1);
  }));

  describe('deterministic mount/visible timer ownership', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('rapidly closing the theme menu right after opening it cancels the stale "visible=true" timer', () => {
      const c = component as any;

      c.themeMenuOpen.set(true);
      fixture.detectChanges();
      // theme menu is mounted synchronously, "visible" flip is scheduled via a timer
      expect(c.themeMenuMounted()).toBeTrue();
      expect(c.themeMenuVisible()).toBeFalse();

      // Close before the pending "visible=true" timer has a chance to fire.
      c.themeMenuOpen.set(false);
      fixture.detectChanges();
      expect(c.themeMenuVisible()).toBeFalse();

      // Advance past where the stale "visible=true" timer would have fired:
      // it must have been cancelled and must NOT flip visible back to true.
      jasmine.clock().tick(50);
      expect(c.themeMenuVisible()).toBeFalse();

      // The real "mounted=false" timer (200ms) still runs to completion.
      jasmine.clock().tick(200);
      expect(c.themeMenuMounted()).toBeFalse();
    });

    it('rapidly closing the avatar menu right after opening it cancels the stale "visible=true" timer', () => {
      const c = component as any;

      c.avatarMenuOpen.set(true);
      fixture.detectChanges();
      expect(c.avatarMenuMounted()).toBeTrue();

      c.avatarMenuOpen.set(false);
      fixture.detectChanges();
      expect(c.avatarMenuVisible()).toBeFalse();

      jasmine.clock().tick(50);
      expect(c.avatarMenuVisible()).toBeFalse();

      jasmine.clock().tick(200);
      expect(c.avatarMenuMounted()).toBeFalse();
    });

    it('ngOnDestroy clears every pending mount/visible timer', () => {
      const c = component as any;

      c.themeMenuOpen.set(true);
      c.avatarMenuOpen.set(true);
      fixture.detectChanges();

      fixture.destroy();

      // Advancing the clock after destroy must not throw or mutate a
      // destroyed component's state via a leaked timer.
      expect(() => jasmine.clock().tick(500)).not.toThrow();
    });
  });
});

describe('HeaderComponent avatar menu positioning', () => {
  it('aligns the menu right edge with its trigger', fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: UserContextService, useValue: { isLoggedIn: signal(true), initials: signal('AB') } },
        { provide: AccountService, useValue: { getProvidedAccountId: () => of(null) } },
        {
          provide: InAppNotificationService,
          useValue: {
            unreadCount: signal(0),
            catchUpCount: signal(0),
            dismissCatchUp: jasmine.createSpy(),
            acknowledgeCatchUpPresented: jasmine.createSpy()
          }
        }
      ]
    });
    spyOn(TestBed.inject(DesignService), 'minBk').and.returnValue(signal(true));
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    (fixture.componentInstance as any).isAllowedPath.set(true);
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.avatar-toggle-button') as HTMLElement;
    expect(trigger).toBeTruthy();
    trigger.click();
    fixture.detectChanges();
    tick(0);
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('.avatar-menu-anchor') as HTMLElement;
    const menu = fixture.nativeElement.querySelector('.avatar-menu-container') as HTMLElement;
    expect(anchor.contains(menu)).toBeTrue();
    expect(Math.abs(menu.getBoundingClientRect().right - trigger.getBoundingClientRect().right)).toBeLessThan(1);
    expect(menu.getBoundingClientRect().top).toBeGreaterThanOrEqual(trigger.getBoundingClientRect().bottom);
  }));
});


describe('HeaderComponent shared mobile avatar menu', () => {
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: UserContextService, useValue: {
          isLoggedIn: signal(true), isLoggedOut: signal(false), initials: signal('AB')
        } },
        { provide: AccountService, useValue: { getProvidedAccountId: () => of(null) } },
        { provide: InAppNotificationService, useValue: {
          unreadCount: signal(0), catchUpCount: signal(0),
          dismissCatchUp: jasmine.createSpy(), acknowledgeCatchUpPresented: jasmine.createSpy()
        } }
      ]
    });
    const design = TestBed.inject(DesignService);
    spyOn(design, 'minBk').and.returnValue(signal(false));
    spyOn(design, 'maxBk').and.returnValue(signal(true));
    fixture = TestBed.createComponent(HeaderComponent);
    (fixture.componentInstance as any).offCanvasMenuOpen.set(true);
    fixture.detectChanges();
  });

  function openMenu(): void {
    const trigger = fixture.nativeElement.querySelector('.off-canvas-menu-container m-header-session-indicator button') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    trigger.click();
    fixture.detectChanges();
    tick(0);
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  }

  it('opens the shared menu above the footer and exposes the same account actions', fakeAsync(() => {
    openMenu();
    const menu = fixture.nativeElement.querySelector('.avatar-menu-container') as HTMLElement;
    const footer = fixture.nativeElement.querySelector('.off-canvas-menu-container .avatar-menu-anchor') as HTMLElement;
    expect(menu).not.toBeNull();
    expect(menu.classList.contains('bottom-full')).toBeTrue();
    expect(menu.classList.contains('pointer-events-none')).toBeFalse();
    expect(footer.contains(menu)).toBeTrue();
    menu.style.transition = 'none';
    (footer.closest('.off-canvas-menu-container') as HTMLElement).style.transition = 'none';
    const rect = menu.getBoundingClientRect();
    expect(rect.bottom).toBeLessThanOrEqual(footer.getBoundingClientRect().top);
    const firstLink = menu.querySelector('a') as HTMLAnchorElement;
    const linkRect = firstLink.getBoundingClientRect();
    const hit = document.elementFromPoint(linkRect.left + linkRect.width / 2, linkRect.top + linkRect.height / 2);
    expect(hit === firstLink || firstLink.contains(hit)).toBeTrue();
    expect(Array.from(menu.querySelectorAll('a')).map(link => link.textContent?.trim())).toEqual([
      'Dashboard', 'Impostazioni', 'Supporto', 'Feedback'
    ]);
    expect(menu.textContent).toContain('Esci');
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    menu.querySelector('a')!.click();
    fixture.detectChanges();
    expect((fixture.componentInstance as any).avatarMenuOpen()).toBeFalse();
    expect((fixture.componentInstance as any).offCanvasMenuOpen()).toBeFalse();
    expect(navigate).toHaveBeenCalled();
    tick(200);
  }));

  it('closes on Escape and reopens from the account label', fakeAsync(() => {
    openMenu();
    const close = fixture.nativeElement.querySelector('.avatar-menu-container button[aria-label="Chiudi menu utente"]') as HTMLButtonElement;
    expect(close).not.toBeNull();
    close.click();
    fixture.detectChanges();
    tick(200);
    expect((fixture.componentInstance as any).avatarMenuMounted()).toBeFalse();
    expect((fixture.componentInstance as any).offCanvasMenuOpen()).toBeTrue();
    openMenu();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    tick(200);
    expect((fixture.componentInstance as any).avatarMenuMounted()).toBeFalse();
    (fixture.componentInstance as any).offCanvasMenuOpen.set(true);
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('.off-canvas-menu-container button.avatar-toggle-button') as HTMLButtonElement;
    label.click();
    fixture.detectChanges();
    tick(0);
    fixture.detectChanges();
    expect((fixture.componentInstance as any).avatarMenuVisible()).toBeTrue();
    expect(label.getAttribute('aria-expanded')).toBe('true');
  }));

  it('places the close button next to the email and blocks taps on the sidebar with a backdrop', fakeAsync(() => {
    openMenu();
    const menu = fixture.nativeElement.querySelector('.avatar-menu-container') as HTMLElement;
    menu.style.transition = 'none';
    const sidebar = fixture.nativeElement.querySelector('.off-canvas-menu-container') as HTMLElement;
    sidebar.style.transition = 'none';
    const close = menu.querySelector('button[aria-label="Chiudi menu utente"]') as HTMLButtonElement;
    const email = close.closest('div.group')!.querySelector('span') as HTMLElement;
    const closeRect = close.getBoundingClientRect();
    const emailRect = email.getBoundingClientRect();
    expect(closeRect.left).toBeGreaterThanOrEqual(emailRect.right);
    expect(Math.abs((closeRect.top + closeRect.bottom) / 2 - (emailRect.top + emailRect.bottom) / 2)).toBeLessThan(1);
    const backdrop = fixture.nativeElement.querySelector('.avatar-menu-backdrop') as HTMLButtonElement;
    expect(backdrop).not.toBeNull();
    const hit = document.elementFromPoint(20, 20);
    expect(hit).toBe(backdrop);
    const underlyingClick = jasmine.createSpy('underlyingClick');
    sidebar.querySelector('a')!.addEventListener('click', underlyingClick);
    (hit as HTMLElement).click();
    fixture.detectChanges();
    expect(underlyingClick).not.toHaveBeenCalled();
    expect((fixture.componentInstance as any).avatarMenuOpen()).toBeFalse();
    expect((fixture.componentInstance as any).offCanvasMenuOpen()).toBeTrue();
    tick(200);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.avatar-menu-backdrop')).toBeNull();
  }));
});
