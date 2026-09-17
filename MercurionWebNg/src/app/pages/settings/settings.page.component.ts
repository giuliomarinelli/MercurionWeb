import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { DisclosureComponent } from '../../components/common/disclosure/disclosure.component'
import { ProgressIndicatorComponent } from '../../components/common/progress-indicator/progress-indicator.component'
import { ScrollContextService } from '../../services/context/scroll-context.service'
import { ShellLayoutService } from '../../services/context/shell-layout.service'
import { SidenavContextService } from '../../services/context/sidenav-context.service'
import { ViewportRuntimeService } from '../../services/context/viewport-runtime.service'
import { SettingsAccountFacade } from './settings-account.facade'
import { SettingsContactPanelComponent } from './settings-contact-panel.component'
import { SettingsOverviewPanelComponent } from './settings-overview-panel.component'
import { SettingsProfilePanelComponent } from './settings-profile-panel.component'
import { SettingsSecurityPanelComponent } from './settings-security-panel.component'

@Component({
  selector: 'm-settings.page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DisclosureComponent,
    ProgressIndicatorComponent,
    SettingsOverviewPanelComponent,
    SettingsProfilePanelComponent,
    SettingsContactPanelComponent,
    SettingsSecurityPanelComponent,
  ],
  template: `
    @if (!account.loading()) {
      <section #pageTop class="main-container" role="main" aria-live="polite" aria-labelledby="settings-heading">
        <h1 id="settings-heading" class="h1-underline">Impostazioni</h1>
        <div class="flex flex-col w-full border border-slate-300 dark:border-slate-500">
          @for (item of items; track item; let i = $index) {
            <m-disclosure
              [id]="computeId(i)"
              [label]="item"
              [expanded]="expandedIndex() === i"
              (toggled)="handleDisclosureToggle(i, $event)"
            >
              @defer (when expandedIndex() === i) {
                @switch (i) {
                  @case (0) { <m-settings-overview-panel /> }
                  @case (1) { <m-settings-profile-panel /> }
                  @case (2) { <m-settings-contact-panel /> }
                  @case (3) { <m-settings-security-panel /> }
                }
              } @placeholder {
                <div class="min-h-24" aria-hidden="true"></div>
              }
            </m-disclosure>
          }
        </div>
      </section>
    } @else {
      <div #pageTop class="main-container h-full" role="main" aria-busy="true" aria-live="polite">
        <div class="fixed inset-0 pointer-events-none">
          <div class="fixed top-1/2 -translate-y-1/2" [style.left.px]="spinnerLeft()" role="status">
            <m-progress-indicator [size]="60" />
          </div>
        </div>
      </div>
    }
  `,
  providers: [SettingsAccountFacade],
})
export class SettingsPageComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly scrollContext = inject(ScrollContextService)
  private readonly shellLayout = inject(ShellLayoutService)
  private readonly sidenavContext = inject(SidenavContextService)
  private readonly viewportRuntime = inject(ViewportRuntimeService)
  readonly account = inject(SettingsAccountFacade)
  readonly disclosureItemHosts = viewChildren('m-disclosure', { read: ElementRef })
  readonly pageTop = viewChild<ElementRef<HTMLElement>>('pageTop')
  readonly items = ['Generali', 'Anagrafica', 'Contatti', 'Sicurezza']
  readonly expandedIndex = signal<number | null>(null)
  readonly spinnerLeft = signal(0)
  private readonly anchors = ['general', 'personal_details', 'contact_details', 'security']
  private resizeObserver?: ResizeObserver
  private spinnerRaf?: number
  private fragment?: string | null

  constructor() {
    effect(() => {
      this.scrollContext.scrollRootRef()
      this.sidenavContext.isOpen()
      this.viewportRuntime.width()
      this.viewportRuntime.height()
      this.account.loading()
      queueMicrotask(() => this.attachSpinnerTracking())
    })
  }

  ngOnInit(): void {
    this.account.load()
    this.route.fragment.subscribe(fragment => {
      this.fragment = fragment
      this.applyFragment(fragment)
    })
  }

  ngAfterViewInit(): void {
    this.attachSpinnerTracking()
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect()
    if (this.spinnerRaf) cancelAnimationFrame(this.spinnerRaf)
  }

  computeId(index: number): string {
    return this.anchors[index] ?? this.anchors[0]
  }

  handleDisclosureToggle(index: number, expanded: boolean): void {
    if (!expanded) {
      this.expandedIndex.set(null)
      void this.router.navigate([], {
        relativeTo: this.route,
        fragment: undefined,
        replaceUrl: true,
        queryParamsHandling: 'preserve',
      })
      const root = this.scrollContext.scrollRootRef()
      if (root) this.scrollContext.smoothToTop(root)
      return
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      fragment: this.computeId(index),
      queryParamsHandling: 'preserve',
    })
  }

  private applyFragment(fragment: string | null): void {
    if (!fragment) {
      this.expandedIndex.set(null)
      return
    }
    const index = Math.max(0, this.anchors.indexOf(fragment))
    this.expandedIndex.set(index)
    setTimeout(() => this.scrollToDisclosure(index), 310)
  }

  private scrollToDisclosure(index: number): void {
    const host = this.disclosureItemHosts()[index]?.nativeElement
    const root = this.scrollContext.scrollRootRef()
    if (!host || !root) return
    const trigger = host.querySelector('button') ?? host
    const y = this.scrollContext.getScrollYRelativeToRoot(trigger, root.nativeElement)
      - this.shellLayout.headerHeight() + 48
    this.scrollContext.smoothTo(root, y, 240)
  }

  private attachSpinnerTracking(): void {
    const host = this.pageTop()?.nativeElement
    if (!host) return
    this.resizeObserver?.disconnect()
    this.resizeObserver = new ResizeObserver(() => this.updateSpinnerLeft())
    this.resizeObserver.observe(host)
    this.updateSpinnerLeft()
    const started = performance.now()
    const follow = (now: number) => {
      this.updateSpinnerLeft()
      if (now - started < 800) this.spinnerRaf = requestAnimationFrame(follow)
    }
    if (this.spinnerRaf) cancelAnimationFrame(this.spinnerRaf)
    this.spinnerRaf = requestAnimationFrame(follow)
  }

  private updateSpinnerLeft(): void {
    const rect = this.pageTop()?.nativeElement.getBoundingClientRect()
    if (rect) this.spinnerLeft.set(rect.left + rect.width / 2)
  }
}
