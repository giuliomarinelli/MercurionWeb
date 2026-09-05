import { TestBed } from '@angular/core/testing';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('slides in after 30ms and auto-dismisses after the requested duration', () => {
    service.trigger('hello', 'success', 1000);
    expect(service.show()).toBeTrue();
    expect(service.slideIn()).toBeFalse();

    jasmine.clock().tick(30);
    expect(service.slideIn()).toBeTrue();

    jasmine.clock().tick(1000);
    // auto-dismiss triggers close(): slideIn goes false immediately, show stays true until the hide timer fires
    expect(service.slideIn()).toBeFalse();
    expect(service.show()).toBeTrue();

    jasmine.clock().tick(300);
    expect(service.show()).toBeFalse();
  });

  it('a manual close() cancels the pending slide-in timer so it cannot re-open the toast', () => {
    service.trigger('hello', 'error', 5000);
    // close before the 30ms slide-in timer has fired
    service.close();

    jasmine.clock().tick(30);
    // the stale slide-in timer must NOT flip slideIn back to true
    expect(service.slideIn()).toBeFalse();

    jasmine.clock().tick(300);
    expect(service.show()).toBeFalse();
  });

  it('a manual close() cancels the pending auto-dismiss timer', () => {
    service.trigger('hello', 'error', 5000);
    service.close();
    jasmine.clock().tick(300);
    expect(service.show()).toBeFalse();

    // trigger a new toast right away; the stale auto-dismiss timer from the
    // previous cycle must not fire and force-close this new toast early
    service.trigger('again', 'success', 5000);
    jasmine.clock().tick(5000 - 300);
    expect(service.show()).toBeTrue();
  });

  it('triggering while already shown is a no-op and does not reset timers', () => {
    service.trigger('first', 'error', 1000);
    jasmine.clock().tick(30);
    expect(service.message()).toBe('first');

    service.trigger('second', 'success', 1000);
    expect(service.message()).toBe('first');
  });

  it('ngOnDestroy clears every pending timer', () => {
    service.trigger('hello', 'error', 5000);
    service.ngOnDestroy();

    jasmine.clock().tick(30);
    expect(service.slideIn()).toBeFalse();

    jasmine.clock().tick(5000);
    // show remains true forever: no timer survives destruction to flip it
    expect(service.show()).toBeTrue();
  });
});