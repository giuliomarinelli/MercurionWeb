import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { HeaderComponent } from './header.component';
import { UserContextService } from '../../../services/context/user-context.service';
import { AccountService } from '../../../services/account.service';
import { DesignService } from '../../../services/design.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent]
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

    it('rapidly closing the mobile avatar menu right after opening it cancels the stale "visible=true" timer', () => {
      const c = component as any;

      c.avatarMobileMenuOpen.set(true);
      fixture.detectChanges();
      expect(c.avatarMobileMenuMounted()).toBeTrue();

      c.avatarMobileMenuOpen.set(false);
      fixture.detectChanges();
      expect(c.avatarMobileMenuVisible()).toBeFalse();

      jasmine.clock().tick(50);
      expect(c.avatarMobileMenuVisible()).toBeFalse();

      jasmine.clock().tick(200);
      expect(c.avatarMobileMenuMounted()).toBeFalse();
    });

    it('ngOnDestroy clears every pending mount/visible timer', () => {
      const c = component as any;

      c.themeMenuOpen.set(true);
      c.avatarMenuOpen.set(true);
      c.avatarMobileMenuOpen.set(true);
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
        { provide: AccountService, useValue: { getProvidedAccountId: () => of(null) } }
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
