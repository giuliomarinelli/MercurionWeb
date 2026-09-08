import { TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';

import { AppContextService } from './app-context.service';

describe('AppContextService', () => {
  let service: AppContextService;
  let rafCallbacks: Array<(t: number) => void>;
  let rafHandle: number;

  beforeEach(() => {
    rafCallbacks = [];
    rafHandle = 0;
    spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb as any);
      return ++rafHandle;
    });
    spyOn(window, 'cancelAnimationFrame').and.callFake(() => { /* no-op tracking not required */ });

    TestBed.configureTestingModule({});
    service = TestBed.inject(AppContextService);
  });

  function flushRaf(time = 0): void {
    const pending = rafCallbacks.splice(0, rafCallbacks.length);
    pending.forEach(cb => cb(time));
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('stops retrying and never schedules another frame once the scroll target never becomes available', () => {
    // No global scroll root registered and no host passed: the target can
    // never resolve, so the bounded wait must terminate deterministically
    // instead of polling requestAnimationFrame forever.
    service.smoothTo(undefined, 0, 100);

    for (let i = 0; i < 200; i++) flushRaf();

    expect(rafCallbacks.length).toBe(0);
  });

  it('cancels the stale animation frame of a superseded smoothTo call for the same element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.scrollTop = 0;
    const host = new ElementRef(el);

    service.smoothTo(host, 500, 1000);
    // First frame of the original (soon to be superseded) animation.
    flushRaf(0);
    expect(rafCallbacks.length).toBe(1); // scheduled its own continuation

    // A newer intent for the very same element supersedes the first one.
    service.smoothTo(host, 250, 1000);
    expect(rafCallbacks.length).toBe(2); // stale continuation + new animation's first frame

    flushRaf(0);

    // The stale (superseded) frame must return immediately without
    // rescheduling itself; only the new animation's own continuation remains.
    expect(rafCallbacks.length).toBe(1);

    document.body.removeChild(el);
  });

  it('does not animate when the resolved target equals the current scroll position', () => {
    const el = document.createElement('div');
    el.scrollTop = 0;
    const host = new ElementRef(el);

    service.smoothTo(host, 0, 100);

    expect(rafCallbacks.length).toBe(0);
  });
});
