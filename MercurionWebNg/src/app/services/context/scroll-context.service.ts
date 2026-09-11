import { ElementRef, Injectable, NgZone, inject, signal } from '@angular/core';
import { BrowserResourceOwner, injectBrowserResourceOwner } from '../../utils/browser-resource-owner.util';

const SCROLL_TARGET_MAX_WAIT_FRAMES = 60;

/**
 * Owns the application's scroll host and scroll-only browser operations.
 * It deliberately contains no shell geometry or domain state.
 */
@Injectable({ providedIn: 'root' })
export class ScrollContextService {
  private readonly zone = inject(NgZone);
  private readonly resources: BrowserResourceOwner = injectBrowserResourceOwner();
  private readonly scrollGenerations = new WeakMap<HTMLElement, number>();
  private readonly _scrollRootRef = signal<ElementRef<HTMLElement> | null>(null);

  readonly scrollRootRef = this._scrollRootRef.asReadonly();

  registerScrollRootRef(ref: ElementRef<HTMLElement>): void {
    this._scrollRootRef.set(ref);
  }

  smoothToTop(host?: ElementRef<HTMLElement>, duration = 240): void {
    this.smoothTo(host, 0, duration);
  }

  smoothTo(
    host: ElementRef<HTMLElement> | null | undefined,
    targetY: number,
    duration = 240
  ): void {
    this.resolveScrollHostThenAnimate(host, targetY, duration, 0);
  }

  getScrollYRelativeToRoot(el: HTMLElement, scrollRoot: HTMLElement): number {
    const elRect = el.getBoundingClientRect();
    const rootRect = scrollRoot.getBoundingClientRect();
    const doc = scrollRoot.ownerDocument;
    const isDocumentRoot =
      !!doc && (scrollRoot === doc.documentElement || scrollRoot === doc.body);

    if (isDocumentRoot) {
      return elRect.top + scrollRoot.scrollTop;
    }

    return (elRect.top - rootRect.top) + scrollRoot.scrollTop;
  }

  private resolveScrollHostThenAnimate(
    host: ElementRef<HTMLElement> | null | undefined,
    targetY: number,
    duration: number,
    attempt: number
  ): void {
    const resolvedHost = host ?? this._scrollRootRef();
    const el = resolvedHost?.nativeElement;

    if (!el) {
      if (attempt >= SCROLL_TARGET_MAX_WAIT_FRAMES) return;
      this.resources.requestAnimationFrame(() =>
        this.resolveScrollHostThenAnimate(resolvedHost ?? undefined, targetY, duration, attempt + 1)
      );
      return;
    }

    this.animateScrollTo(el, targetY, duration);
  }

  private animateScrollTo(el: HTMLElement, targetY: number, duration: number): void {
    const generation = (this.scrollGenerations.get(el) ?? 0) + 1;
    this.scrollGenerations.set(el, generation);

    this.zone.runOutsideAngular(() => {
      const start = el.scrollTop;
      const delta = targetY - start;
      if (delta === 0) return;

      const startTime = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const step = (now: number) => {
        if (this.scrollGenerations.get(el) !== generation) return;
        const progress = Math.min(1, (now - startTime) / duration);
        el.scrollTop = start + delta * easeOutCubic(progress);
        if (progress < 1) this.resources.requestAnimationFrame(step);
      };

      this.resources.requestAnimationFrame(step);
    });
  }
}
