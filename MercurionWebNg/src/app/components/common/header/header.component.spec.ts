import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderComponent } from './header.component';

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