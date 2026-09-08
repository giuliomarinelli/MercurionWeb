import { TestBed } from '@angular/core/testing';

import { SidenavContextService } from './sidenav-context.service';

describe('SidenavContextService', () => {
  let service: SidenavContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidenavContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts already open/mounted/visible synchronously (no flicker on app init)', () => {
    expect(service.isOpen()).toBeTrue();
    expect(service.isMounted()).toBeTrue();
    expect(service.isVisible()).toBeTrue();
  });

  describe('deterministic transition timer ownership', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('close() then open() before the unmount timer fires cancels the stale "mounted=false" timer', () => {
      service.close();
      expect(service.isVisible()).toBeFalse();
      expect(service.isMounted()).toBeTrue(); // still mounted until the 200ms timer fires

      // Re-open before the 200ms unmount timer has a chance to fire.
      service.open();
      jasmine.clock().tick(200);
      // The stale "mounted=false" timer must have been cancelled: reopening
      // must not un-mount the sidenav out from under the new open state.
      expect(service.isMounted()).toBeTrue();
    });

    it('open() then close() before the show timer fires cancels the stale "visible=true" timer', () => {
      service.close();
      jasmine.clock().tick(200);
      expect(service.isMounted()).toBeFalse();

      service.open();
      expect(service.isMounted()).toBeTrue();
      expect(service.isVisible()).toBeFalse();

      service.close();
      jasmine.clock().tick(10);
      // The stale "visible=true" timer from the aborted open() must not fire.
      expect(service.isVisible()).toBeFalse();
    });

    it('ngOnDestroy clears the pending transition timer', () => {
      service.close();
      expect(service.isMounted()).toBeTrue();

      service.ngOnDestroy();

      jasmine.clock().tick(500);
      // No leaked timer should have changed state after destroy.
      expect(service.isMounted()).toBeTrue();
    });
  });
});