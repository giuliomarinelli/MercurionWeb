import { TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { ScrollContextService } from './scroll-context.service';

describe('ScrollContextService', () => {
  let service: ScrollContextService;
  let rafCallbacks: Array<(t: number) => void>;
  let rafHandle: number;

  beforeEach(() => {
    rafCallbacks = [];
    rafHandle = 0;
    spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb as any);
      return ++rafHandle;
    });
    spyOn(window, 'cancelAnimationFrame').and.callFake(() => {});
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScrollContextService);
  });

  function flushRaf(time = 0): void {
    const pending = rafCallbacks.splice(0, rafCallbacks.length);
    pending.forEach(cb => cb(time));
  }

  it('registers and exposes only the scroll root', () => {
    const host = new ElementRef(document.createElement('div'));
    service.registerScrollRootRef(host);
    expect(service.scrollRootRef()).toBe(host);
  });

  it('bounds resolution when no scroll host is available', () => {
    service.smoothTo(undefined, 0, 100);
    for (let i = 0; i < 200; i++) flushRaf();
    expect(rafCallbacks.length).toBe(0);
  });

  it('supersedes stale animations for the same element', () => {
    const el = document.createElement('div');
    const host = new ElementRef(el);
    service.smoothTo(host, 500, 1000);
    flushRaf(0);
    service.smoothTo(host, 250, 1000);
    flushRaf(0);
    expect(rafCallbacks.length).toBe(1);
  });

  it('calculates document-root-relative positions without double counting', () => {
    const root = document.documentElement;
    const target = document.createElement('div');
    spyOn(target, 'getBoundingClientRect').and.returnValue({ top: 100 } as DOMRect);
    spyOn(root, 'getBoundingClientRect').and.returnValue({ top: 0 } as DOMRect);
    expect(service.getScrollYRelativeToRoot(target, root)).toBe(100);
  });
});
