import { ElementRef, inject, Injectable, NgZone, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppContextService {

  private readonly zone = inject(NgZone)

  private _addedTick = signal<number>(0)
  readonly addedTick = this._addedTick.asReadonly()

  private _addedScrollTick = signal<number>(0)
  readonly addedScrollTick = this._addedScrollTick.asReadonly()

  private _addedGlobalScrollRootRefTick = signal<number>(0)
  readonly addedGlobalScrollRootRefTick = this._addedGlobalScrollRootRefTick.asReadonly()

  private _refetchDashboardaddedTick = signal<number>(0)
  readonly refetchDashboardAddedTick = this._refetchDashboardaddedTick.asReadonly()

  private _globalScollRootRef = signal<ElementRef<HTMLElement> | null>(null)
  readonly globalScollRootRef = this._globalScollRootRef.asReadonly()

  private _headerHeight = signal<number>(0)
  readonly headerHeight = this._headerHeight.asReadonly()

  notifyAdded(): void {
    this._addedTick.update(x => x + 1)
  }

  notifyRequestGlobalScrollRootRefTick(): void {
    this._addedGlobalScrollRootRefTick.update(x => x + 1)
  }

  triggerScrollToTopGlobally(): void {
    this._addedScrollTick.update(x => x + 1)
  }

  triggerDashboardRefetch(): void {
    this._refetchDashboardaddedTick.update(x => x + 1)
  }

  setGlobalScrollRootRef(r: ElementRef<HTMLElement>): void {
    this._globalScollRootRef.set(r)
  }

  setHeaderHeight(h: number) {
    this._headerHeight.set(h)
  }

  smoothToTop(host: ElementRef<HTMLElement>, targetY: number, duration = 240) {

    const el = host?.nativeElement
    if (!el) {
      requestAnimationFrame(() => this.smoothToTop(host, targetY, duration))
      return
    }

    this.zone.runOutsideAngular(() => {
      const startY = el.scrollTop
      const delta = targetY - startY
      if (delta === 0) {
        return
      }
      const startTime = performance.now()
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

      const step = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(1, elapsed / duration)
        el.scrollTop = startY + delta * easeOutCubic(progress)
        if (progress < 1) requestAnimationFrame(step)
      }

      requestAnimationFrame(step)
    })
  }

  smoothTo(
    host: ElementRef<HTMLElement>,
    targetY: number,
    duration = 240
  ) {
    const el = host?.nativeElement;
    if (!el) {
      requestAnimationFrame(() => this.smoothTo(host, targetY, duration));
      return;
    }

    this.zone.runOutsideAngular(() => {

      const start = el.scrollTop
      const delta = targetY - start
      if (delta === 0) {
        return
      }
      const startTime = performance.now()
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

      const step = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(1, elapsed / duration)
        el.scrollTop = start + delta * easeOutCubic(progress)
        if (progress < 1) requestAnimationFrame(step)
      }

      requestAnimationFrame(step)
    })
  }

  getScrollYRelativeToRoot(
    el: HTMLElement,
    scrollRoot: HTMLElement
  ): number {
    const elRect = el.getBoundingClientRect()
    const rootRect = scrollRoot.getBoundingClientRect()
    return (elRect.top - rootRect.top) + scrollRoot.scrollTop
  }




}
