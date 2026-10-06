import { computed, Injectable, Signal, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ViewportRuler } from '@angular/cdk/scrolling'

// ✅ Enum con valori stringa
export enum Breakpoints {
  ZERO = '0',
  _3XS = '3xs',
  _2XS = '2xs',
  XS = 'xs',
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
  _2XL = '2xl'
}

// ✅ Tipo string literal automatico dall'enum
export type Breakpoint = `${Breakpoints}`

// ✅ Wrapper per verbose output
export type BreakpointVerboseMap = Record<Breakpoint, string>

@Injectable({ providedIn: 'root' })
export class DesignService {

  private readonly bkMap = new Map<Breakpoints, number>([
    [Breakpoints.ZERO, 0],
    [Breakpoints._3XS, 321],
    [Breakpoints._2XS, 376],
    [Breakpoints.XS, 426],
    [Breakpoints.SM, 640],
    [Breakpoints.MD, 768],
    [Breakpoints.LG, 1024],
    [Breakpoints.XL, 1280],
    [Breakpoints._2XL, 1536]
  ])

  private readonly bkVerboseMap: BreakpointVerboseMap = {
    '0': 'zero pixel',
    '3xs': 'small vertical phone display',
    '2xs': 'medium vertical phone display',
    'xs': 'large vertical phone display',
    'sm': 'horizontal phone display',
    'md': 'vertical tablet',
    'lg': 'horizontal tablet or small laptop',
    'xl': 'widescreen laptop',
    '2xl': 'ultra widescreen laptop'
  }

  private readonly viewportWidth = signal(0)
  private readonly __currentBk = signal(Breakpoints.ZERO)

  constructor(private viewportRuler: ViewportRuler) {
    this.updateCurrentBreakpoint()
    this.listenToViewportChanges()
  }

  // ✅ Getter corrente "enum"
  public get currentBreakpointEnum(): Breakpoints {
    return this.__currentBk()
  }

  // ✅ Getter corrente "stringa literal"
  public get currentBreakpoint(): Breakpoint {
    return this.__currentBk() as Breakpoint
  }

  // ✅ Verbose description (clean!)
  public get currentBreakpointVerbose(): string {
    return this.bkVerboseMap[this.currentBreakpoint] ?? 'Unknown'
  }

  // Match Tailwind's min-width and exclusive max-width variants exactly.
  public minBk(breakpoint: Breakpoint): Signal<boolean> {
    return computed(() => this.viewportWidth() >= this.bkMap.get(breakpoint as Breakpoints)!)
  }

  public maxBk(breakpoint: Breakpoint): Signal<boolean> {
    return computed(() => this.viewportWidth() < this.bkMap.get(breakpoint as Breakpoints)!)
  }

  // ✅ Utility: è mobile?
  public isMobile(): boolean {
    const currentWidth = this.viewportRuler.getViewportSize().width
    return currentWidth < this.bkMap.get(Breakpoints.MD)!
  }

  // ✅ Update corrente
  private updateCurrentBreakpoint(): void {
    const viewportWidth = this.viewportRuler.getViewportSize().width
    this.viewportWidth.set(viewportWidth)
    let detectedBreakpoint: Breakpoints = Breakpoints.ZERO

    for (const [breakpoint, width] of this.bkMap.entries()) {
      if (viewportWidth < width) {
        break
      }
      detectedBreakpoint = breakpoint
    }

    if (this.__currentBk() !== detectedBreakpoint) {
      this.__currentBk.set(detectedBreakpoint)
    }
  }

  // ✅ Listener resize con debounce (CDK scrolling)
  private listenToViewportChanges(): void {
    this.viewportRuler.change(10).pipe(takeUntilDestroyed()).subscribe(() => this.updateCurrentBreakpoint())
  }

}
