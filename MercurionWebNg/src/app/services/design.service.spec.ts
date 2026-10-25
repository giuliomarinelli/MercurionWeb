import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ViewportRuntimeService } from './context/viewport-runtime.service';

import { Breakpoint, Breakpoints, DesignService } from './design.service';

describe('DesignService', () => {
  let service: DesignService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DesignService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

describe('DesignService CSS breakpoint alignment', () => {
  const thresholds: [Breakpoint, number][] = [
    ['0', 0], ['3xs', 321], ['2xs', 376], ['xs', 426], ['sm', 640],
    ['md', 768], ['lg', 1024], ['xl', 1280], ['2xl', 1536]
  ];
  const measuredWidth = signal(375);
  let service: DesignService;

  beforeEach(() => {
    measuredWidth.set(375);
    TestBed.configureTestingModule({ providers: [{ provide: ViewportRuntimeService, useValue: { width: measuredWidth } }] });
    service = TestBed.inject(DesignService);
  });

  it('uses the same boundaries as CSS before, at and after every breakpoint', () => {
    const queries = thresholds.map(([breakpoint, threshold]) => ({
      threshold, min: service.minBk(breakpoint), max: service.maxBk(breakpoint)
    }));
    for (const [, threshold] of thresholds) {
      for (const width of [Math.max(0, threshold - 1), threshold, threshold + 1]) {
        measuredWidth.set(width);
        for (const query of queries) {
          expect(query.min()).withContext(`min ${query.threshold} at ${width}`).toBe(width >= query.threshold);
          expect(query.max()).withContext(`max ${query.threshold} at ${width}`).toBe(width < query.threshold);
        }
      }
    }
  });

  it('keeps phone landscape below desktop and updates existing signals on rotation', () => {
    const desktop = service.minBk('lg');
    const tablet = service.minBk('md');
    expect(service.currentBreakpointEnum).toBe(Breakpoints._3XS);
    expect(tablet()).toBeFalse();
    measuredWidth.set(812);
    expect(service.currentBreakpointEnum).toBe(Breakpoints.MD);
    expect(tablet()).toBeTrue();
    expect(desktop()).toBeFalse();
    measuredWidth.set(375);
    expect(tablet()).toBeFalse();
    expect(desktop()).toBeFalse();
  });
});

describe('DesignService with the application viewport owner', () => {
  it('tracks layout width through resize and visual viewport events without a second cache', fakeAsync(() => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    let width = 375;
    Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => width });
    try {
      const service = TestBed.inject(DesignService);
      const desktop = service.minBk('xl');
      expect(desktop()).toBeFalse();
      width = 1536;
      window.dispatchEvent(new Event('resize'));
      flushMicrotasks();
      expect(desktop()).toBeTrue();
      expect(service.currentBreakpointEnum).toBe(Breakpoints._2XL);
      expect(service.isMobile()).toBeFalse();
      width = 375;
      (window.visualViewport ?? window).dispatchEvent(new Event('resize'));
      flushMicrotasks();
      expect(desktop()).toBeFalse();
      expect(service.isMobile()).toBeTrue();
    } finally {
      if (descriptor) Object.defineProperty(window, 'innerWidth', descriptor);
      else Reflect.deleteProperty(window, 'innerWidth');
    }
  }));
});
