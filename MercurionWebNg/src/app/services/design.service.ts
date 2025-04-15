import { computed, Injectable, Signal, signal, WritableSignal } from '@angular/core'
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

  private readonly __currentBk: WritableSignal<Breakpoints> = signal(Breakpoints.SM)

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

  // ✅ Verifica se il breakpoint corrente è >= di quello passato (in pixel)
  public minBk(breakpoint: Breakpoint): Signal<boolean> {
    const ordered: Breakpoints[] = [
      Breakpoints._3XS,
      Breakpoints._2XS,
      Breakpoints.XS,
      Breakpoints.SM,
      Breakpoints.MD,
      Breakpoints.LG,
      Breakpoints.XL,
      Breakpoints._2XL
    ]

    return computed(() => {
      const current = this.__currentBk() // 💡 trigger reattività
      const currentIdx = ordered.indexOf(current)
      const targetIdx = ordered.indexOf(breakpoint as Breakpoints)
      return currentIdx >= targetIdx
    })
  }

  // ✅ Utility: è mobile?
  public isMobile(): boolean {
    const currentWidth = this.viewportRuler.getViewportSize().width
    return currentWidth < this.bkMap.get(Breakpoints.MD)!
  }

  // ✅ Update corrente
  private updateCurrentBreakpoint(): void {
    const viewportWidth = this.viewportRuler.getViewportSize().width
    let detectedBreakpoint: Breakpoints = Breakpoints._2XL

    for (const [breakpoint, width] of this.bkMap.entries()) {
      if (viewportWidth < width) {
        detectedBreakpoint = breakpoint
        break
      }
    }

    if (this.__currentBk() !== detectedBreakpoint) {
      this.__currentBk.set(detectedBreakpoint)
    }
  }

  // ✅ Listener resize con debounce (CDK scrolling)
  private listenToViewportChanges(): void {
    this.viewportRuler.change(100).subscribe(() => this.updateCurrentBreakpoint())
  }

}
