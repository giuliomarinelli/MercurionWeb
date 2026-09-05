import { ElementRef, Injectable, NgZone, inject, signal } from '@angular/core';
import { BrowserResourceOwner, injectBrowserResourceOwner } from '../../utils/browser-resource-owner.util';

/**
 * Bounded number of animation frames `smoothTo` waits for a scroll target to
 * become available before giving up safely. A target that never mounts can
 * therefore never keep this service polling indefinitely.
 */
const SCROLL_TARGET_MAX_WAIT_FRAMES = 60;

@Injectable({
  providedIn: 'root'
})
export class AppContextService {

  private readonly zone = inject(NgZone)

  /**
   * Owns every RAF scheduled by this service so it can be cancelled
   * deterministically; also disposed automatically if this root service's
   * injector is ever torn down (e.g. between tests).
   */
  private readonly resources: BrowserResourceOwner = injectBrowserResourceOwner()

  /**
   * Per-element animation generation. A new `smoothTo` call targeting the
   * same element supersedes (and cancels) any in-flight animation for that
   * element, so a stale animation frame can never mutate `scrollTop` after
   * being superseded by a newer scroll intent.
   */
  private readonly scrollGenerations = new WeakMap<HTMLElement, number>()

  private _addedScrollTick = signal<number>(0)
  readonly addedScrollTick = this._addedScrollTick.asReadonly()

  private _addedGlobalScrollRootRefTick = signal<number>(0)
  readonly addedGlobalScrollRootRefTick = this._addedGlobalScrollRootRefTick.asReadonly()


  private _globalScollRootRef = signal<ElementRef<HTMLElement> | null>(null)
  readonly globalScollRootRef = this._globalScollRootRef.asReadonly()

  private _headerHeight = signal<number>(0)
  readonly headerHeight = this._headerHeight.asReadonly()

  private _addedTriggerCloseOffCanvasMenu = signal<number>(0)
  readonly addedTriggerCloseOffCanvasMenu = this._addedTriggerCloseOffCanvasMenu.asReadonly()

  notifyRequestGlobalScrollRootRefTick(): void {
    this._addedGlobalScrollRootRefTick.update(x => x + 1)
  }

  notifyAddedTriggerCloseOffCanvasMenu(): void {
    this._addedTriggerCloseOffCanvasMenu.update((x) => x + 1)
  }

  triggerScrollToTopGlobally(): void {
    this._addedScrollTick.update(x => x + 1)
  }

  setGlobalScrollRootRef(r: ElementRef<HTMLElement>): void {
    this._globalScollRootRef.set(r)
  }

  setHeaderHeight(h: number) {
    this._headerHeight.set(h)
  }

  smoothToTop(host?: ElementRef<HTMLElement>, duration = 240) {
    this.smoothTo(host, 0, duration)
  }

  smoothTo(
    host: ElementRef<HTMLElement> | null | undefined,
    targetY: number,
    duration = 240
  ): void {
    this.resolveScrollHostThenAnimate(host, targetY, duration, 0)
  }

  /**
   * Resolves the scroll host with a bounded/cancellable RAF wait instead of
   * an unconditional recursive retry: if the target never becomes available
   * within `SCROLL_TARGET_MAX_WAIT_FRAMES` frames, it stops safely without
   * ever polling forever.
   */
  private resolveScrollHostThenAnimate(
    host: ElementRef<HTMLElement> | null | undefined,
    targetY: number,
    duration: number,
    attempt: number
  ): void {
    // fallback: se host non viene passato, usa quello registrato dall'AppComponent
    const resolvedHost = host ?? this._globalScollRootRef()
    const el = resolvedHost?.nativeElement

    if (!el) {
      if (attempt >= SCROLL_TARGET_MAX_WAIT_FRAMES) {
        // Safe terminal result: the target never mounted, so we stop instead
        // of retrying indefinitely.
        return
      }

      this.resources.requestAnimationFrame(() =>
        this.resolveScrollHostThenAnimate(resolvedHost ?? undefined, targetY, duration, attempt + 1)
      )
      return
    }

    this.animateScrollTo(el, targetY, duration)
  }

  private animateScrollTo(el: HTMLElement, targetY: number, duration: number): void {
    // A newer smoothTo() call for this same element supersedes this run.
    const generation = (this.scrollGenerations.get(el) ?? 0) + 1
    this.scrollGenerations.set(el, generation)

    this.zone.runOutsideAngular(() => {
      const start = el.scrollTop
      const delta = targetY - start
      if (delta === 0) return

      const startTime = performance.now()
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

      const step = (now: number) => {
        // Stale frame from a superseded/older animation: never mutate
        // scrollTop once a newer intent has taken over this element.
        if (this.scrollGenerations.get(el) !== generation) return

        const elapsed = now - startTime
        const progress = Math.min(1, elapsed / duration)
        el.scrollTop = start + delta * easeOutCubic(progress)
        if (progress < 1) this.resources.requestAnimationFrame(step)
      }

      this.resources.requestAnimationFrame(step)
    })
  }

  getScrollYRelativeToRoot(
    el: HTMLElement,
    scrollRoot: HTMLElement
  ): number {
    const elRect = el.getBoundingClientRect()
    const rootRect = scrollRoot.getBoundingClientRect()

    // documentElement/body already report a rect top that reflects scrollTop,
    // so avoid double-counting when they are the scroll root.
    const doc = scrollRoot.ownerDocument
    const isDocumentRoot =
      !!doc && (scrollRoot === doc.documentElement || scrollRoot === doc.body)

    if (isDocumentRoot) {
      return elRect.top + scrollRoot.scrollTop
    }

    return (elRect.top - rootRect.top) + scrollRoot.scrollTop
  }




}

