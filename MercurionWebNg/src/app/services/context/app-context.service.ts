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

  notifyAdded(): void {
    this._addedTick.update(x => x + 1)
  }

  triggerScrollToTopGlobally(): void {
    this._addedScrollTick.update(x => x + 1)
  }

  scrollToTop(host: ElementRef<HTMLElement>, duration = 240) {

    const nativeElement = host?.nativeElement;

    if (!nativeElement) {
      requestAnimationFrame(() => this.scrollToTop(nativeElement, duration))
      return
    }

    this.zone.runOutsideAngular(() => {

      const start = nativeElement.scrollTop
      if (start === 0) return

      const startTime = performance.now()
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

      const step = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(1, elapsed / duration)
        const y = Math.floor(start * (1 - easeOutCubic(progress)))
        nativeElement.scrollTop = y
        if (progress < 1) requestAnimationFrame(step)
      };

      requestAnimationFrame(step)
    })
  }



}
