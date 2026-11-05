import { computed, inject, Injectable, Signal } from '@angular/core'
import { ViewportRuntimeService } from './context/viewport-runtime.service'

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

  private readonly viewportWidth = inject(ViewportRuntimeService).width
  private readonly __currentBk = computed(() => {
    const width = this.viewportWidth()
    let detected = Breakpoints.ZERO
    for (const [breakpoint, threshold] of this.bkMap) {
      if (width < threshold) break
      detected = breakpoint
    }
    return detected
  })

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
    return this.viewportWidth() < this.bkMap.get(Breakpoints.MD)!
  }

}
