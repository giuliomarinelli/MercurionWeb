import { TestBed } from '@angular/core/testing';
import { ViewportRuler } from '@angular/cdk/scrolling';
import { Subject } from 'rxjs';

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
  let width: number;
  let changes: Subject<Event>;
  let service: DesignService;

  beforeEach(() => {
    width = 375;
    changes = new Subject<Event>();
    TestBed.configureTestingModule({ providers: [{ provide: ViewportRuler, useValue: {
      getViewportSize: () => ({ width, height: 812 }), change: () => changes
    } }] });
    service = TestBed.inject(DesignService);
  });

  it('uses the same boundaries as CSS before, at and after every breakpoint', () => {
    const queries = thresholds.map(([breakpoint, threshold]) => ({
      threshold, min: service.minBk(breakpoint), max: service.maxBk(breakpoint)
    }));
    for (const [, threshold] of thresholds) {
      for (width of [Math.max(0, threshold - 1), threshold, threshold + 1]) {
        changes.next(new Event('resize'));
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
    width = 812;
    changes.next(new Event('resize'));
    expect(service.currentBreakpointEnum).toBe(Breakpoints.MD);
    expect(tablet()).toBeTrue();
    expect(desktop()).toBeFalse();
    width = 375;
    changes.next(new Event('resize'));
    expect(tablet()).toBeFalse();
    expect(desktop()).toBeFalse();
  });
});
