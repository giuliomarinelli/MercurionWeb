import { DestroyRef, inject } from '@angular/core'

export interface BoundedRafWaitOptions {
  /** Maximum number of animation frames to wait before giving up. */
  maxAttempts?: number
  /** Invoked once when the bounded wait is exhausted without becoming ready. */
  onExhausted?: () => void
}

/**
 * Deterministic owner for DOM listeners, timers and `requestAnimationFrame`
 * handles.
 *
 * Every resource scheduled through an instance is tracked so it can be
 * cancelled explicitly and so it is always cancelled on `dispose()`
 * (component/service destruction). Once disposed, no previously scheduled
 * timer/interval/RAF/listener callback can run again and no new resource can
 * be scheduled, so a destroyed/superseded owner can never mutate state or
 * fire a listener after teardown.
 */
export class BrowserResourceOwner {
  private disposed = false
  private readonly timeoutIds = new Set<ReturnType<typeof setTimeout>>()
  private readonly intervalIds = new Set<ReturnType<typeof setInterval>>()
  private readonly rafIds = new Set<number>()
  private readonly listenerTeardowns = new Set<() => void>()

  /** True once `dispose()` has run; no further resource can be scheduled. */
  get isDisposed(): boolean {
    return this.disposed
  }

  /** Deterministic, owner-tracked `setTimeout`. No-op once disposed. */
  setTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> | undefined {
    if (this.disposed) return undefined
    const id = setTimeout(() => {
      this.timeoutIds.delete(id)
      if (this.disposed) return
      fn()
    }, ms)
    this.timeoutIds.add(id)
    return id
  }

  /** Deterministic, owner-tracked `setInterval`. No-op once disposed. */
  setInterval(fn: () => void, ms: number): ReturnType<typeof setInterval> | undefined {
    if (this.disposed) return undefined
    const id = setInterval(() => {
      if (this.disposed) {
        clearInterval(id)
        this.intervalIds.delete(id)
        return
      }
      fn()
    }, ms)
    this.intervalIds.add(id)
    return id
  }

  /** Deterministic, owner-tracked `requestAnimationFrame`. No-op once disposed. */
  requestAnimationFrame(fn: (time: number) => void): number | undefined {
    if (this.disposed) return undefined
    const id = requestAnimationFrame((time) => {
      this.rafIds.delete(id)
      if (this.disposed) return
      fn(time)
    })
    this.rafIds.add(id)
    return id
  }

  /**
   * Bounded `requestAnimationFrame` polling for a DOM target/condition.
   *
   * Retries once per frame until `predicate()` returns a truthy value or
   * `maxAttempts` is reached; it never schedules another frame once
   * disposed, so a DOM-target wait can never poll indefinitely and never
   * outlives its owner.
   */
  waitForCondition<T>(
    predicate: () => T | null | undefined | false,
    onReady: (value: T) => void,
    opts: BoundedRafWaitOptions = {}
  ): void {
    const maxAttempts = opts.maxAttempts ?? 30
    let attempt = 0

    const tick = () => {
      if (this.disposed) return
      const value = predicate()
      if (value) {
        onReady(value)
        return
      }
      attempt++
      if (attempt >= maxAttempts) {
        opts.onExhausted?.()
        return
      }
      this.requestAnimationFrame(tick)
    }

    this.requestAnimationFrame(tick)
  }

  /** Owner-tracked `addEventListener` with an explicit, idempotent teardown. */
  addEventListener(
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): () => void {
    if (this.disposed) return () => { }
    target.addEventListener(type, handler, options)
    let removed = false
    const teardown = () => {
      if (removed) return
      removed = true
      target.removeEventListener(type, handler, options)
      this.listenerTeardowns.delete(teardown)
    }
    this.listenerTeardowns.add(teardown)
    return teardown
  }

  clearTimeout(id: ReturnType<typeof setTimeout> | undefined): void {
    if (id === undefined) return
    clearTimeout(id)
    this.timeoutIds.delete(id)
  }

  clearInterval(id: ReturnType<typeof setInterval> | undefined): void {
    if (id === undefined) return
    clearInterval(id)
    this.intervalIds.delete(id)
  }

  cancelAnimationFrame(id: number | undefined): void {
    if (id === undefined) return
    cancelAnimationFrame(id)
    this.rafIds.delete(id)
  }

  /** Cancels every tracked timer/interval/RAF/listener; idempotent. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.timeoutIds.forEach(id => clearTimeout(id))
    this.timeoutIds.clear()
    this.intervalIds.forEach(id => clearInterval(id))
    this.intervalIds.clear()
    this.rafIds.forEach(id => cancelAnimationFrame(id))
    this.rafIds.clear()
    this.listenerTeardowns.forEach(teardown => teardown())
    this.listenerTeardowns.clear()
  }
}

/**
 * Creates a `BrowserResourceOwner` bound to the current Angular injection
 * context's `DestroyRef`, so every scheduled resource is disposed
 * automatically on destruction without requiring an explicit `ngOnDestroy`
 * call.
 */
export function injectBrowserResourceOwner(): BrowserResourceOwner {
  const owner = new BrowserResourceOwner()
  const destroyRef = inject(DestroyRef)
  destroyRef.onDestroy(() => owner.dispose())
  return owner
}
