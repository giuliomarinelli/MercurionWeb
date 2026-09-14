import { TestBed } from '@angular/core/testing';
import { ViewportRuntimeService } from './viewport-runtime.service';

describe('ViewportRuntimeService', () => {
  let service: ViewportRuntimeService;
  let originalWidth: number;
  let originalHeight: number;
  let originalScrollY: number;

  beforeEach(() => {
    originalWidth = window.innerWidth;
    originalHeight = window.innerHeight;
    originalScrollY = window.scrollY;
    TestBed.configureTestingModule({});
    service = TestBed.inject(ViewportRuntimeService);
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: originalScrollY });
  });

  it('exposes the initial window measurements and derived orientation', () => {
    expect(service.width()).toBe(window.innerWidth);
    expect(service.height()).toBe(window.innerHeight);
    expect(service.visualWidth()).toBe(window.innerWidth);
    expect(service.visualHeight()).toBe(window.innerHeight);
    expect(service.state().landscape).toBe(window.innerWidth >= window.innerHeight);
  });

  it('coalesces resize and scroll events into one updated state', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 480 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 120 });

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));
    await Promise.resolve();

    expect(service.width()).toBe(480);
    expect(service.height()).toBe(900);
    expect(service.scrollY()).toBe(120);
    expect(service.state().landscape).toBeFalse();
  });

  it('provides a near-bottom helper for both element and document roots', () => {
    const root = document.createElement('div');
    Object.defineProperties(root, {
      scrollTop: { configurable: true, value: 700 },
      clientHeight: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 1100 },
    });

    expect(service.isNearBottom(root, 100)).toBeTrue();
    expect(service.isNearBottom(root, 50)).toBeFalse();
  });

  it('removes its global listeners when the owning injector is destroyed', () => {
    const removeSpy = spyOn(window, 'removeEventListener').and.callThrough();
    TestBed.resetTestingModule();
    const removedTypes = removeSpy.calls.allArgs().map(([type]) => type);
    expect(removedTypes).toContain('resize');
    expect(removedTypes).toContain('orientationchange');
    expect(removedTypes).toContain('scroll');
  });
});
