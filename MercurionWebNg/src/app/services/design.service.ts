import { Injectable, signal } from "@angular/core"
import { Breakpoints } from "../Models/enums/breakpoints.enum"
import { Breakpoint } from "../Models/types/breakpoint.type"
import { ViewportRuler } from "@angular/cdk/overlay"

@Injectable({
  providedIn: 'root',
})
export class DesignService {
  private readonly bkMap = new Map<Breakpoints, number>([
    [Breakpoints._3XS, 320],
    [Breakpoints._2XS, 375],
    [Breakpoints.XS, 425],
    [Breakpoints.SM, 640],
    [Breakpoints.MD, 768],
    [Breakpoints.LG, 1024],
    [Breakpoints.XL, 1280],
    [Breakpoints._2XL, 1536],
  ])

  private readonly bkVerboseMap = new Map<Breakpoint, string>([
    ['3xs', 'small vertical phone display'],
    ['2xs', 'medium vertical phone display'],
    ['xs', 'large vertical phone display'],
    ['sm', 'horizontal phone display'],
    ['md', 'vertical tablet'],
    ['lg', 'horizontal tablet or small laptop'],
    ['xl', 'widescreen laptop'],
    ['2xl', 'ultra widescreen laptop'],
  ])

  private readonly _currentBk = signal<Breakpoints>(Breakpoints.SM)
  public readonly currentBk = this._currentBk.asReadonly()

  constructor(private viewportRuler: ViewportRuler) {
    this.initCurrentBreakpoint()
    this.listenToViewportChanges()
  }

  public get currentBreakpointVerbose(): string {
    return this.bkVerboseMap.get(this._currentBk()) ?? 'Unknown'
  }

  public isMobile(): boolean {
    const current = this._currentBk()
    return current === Breakpoints._3XS || current === Breakpoints._2XS || current === Breakpoints.XS
  }

  public isTablet(): boolean {
    const current = this._currentBk()
    return current === Breakpoints.SM || current === Breakpoints.MD
  }

  public isDesktop(): boolean {
    const current = this._currentBk()
    return current === Breakpoints.LG || current === Breakpoints.XL || current === Breakpoints._2XL
  }

  private initCurrentBreakpoint(): void {
    this.updateCurrentBreakpoint()
  }

  private updateCurrentBreakpoint(): void {
    const { width } = this.viewportRuler.getViewportSize()
    const sortedBreakpoints = [...this.bkMap.entries()].sort((a, b) => b[1] - a[1]) // ordine decrescente

    const matchedBreakpoint = sortedBreakpoints.find(([_, value]) => width >= value)?.[0] ?? Breakpoints._3XS

    if (this._currentBk() !== matchedBreakpoint) {
      this._currentBk.set(matchedBreakpoint)
    }
  }

  private listenToViewportChanges(): void {
    this.viewportRuler.change(100).subscribe(() => this.updateCurrentBreakpoint())
  }
}
