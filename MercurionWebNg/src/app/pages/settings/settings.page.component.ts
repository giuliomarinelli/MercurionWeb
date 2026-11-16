import { SettingsSecurityFacade } from './settings-security.facade'
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { injectBrowserResourceOwner } from '../../utils/browser-resource-owner.util'
import { ActivatedRoute, Router, Scroll } from '@angular/router'
import { filter } from 'rxjs'
import {
  DisclosureComponent,
  DisclosureTriggerDirective,
} from '../../components/common/disclosure/disclosure.component'
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
  styleUrls: ['./settings-panel.styles.css', './settings-page.styles.css'],
  imports: [
    DisclosureComponent,
    DisclosureTriggerDirective,
    ProgressIndicatorComponent,
    SettingsOverviewPanelComponent,
    SettingsProfilePanelComponent,
    SettingsContactPanelComponent,
    SettingsSecurityPanelComponent,
  ],
  template: `
    @if (!account.loading()) {
      <section #pageTop class="main-container settings-page" role="main" aria-live="polite" aria-labelledby="settings-heading">
        <header class="settings-page-heading">
          <h1 id="settings-heading">Impostazioni</h1>
          <p>Gestisci profilo, contatti e sicurezza del tuo account.</p>
        </header>
        <div
          class="transition-[padding-bottom] duration-200 ease-out"
          #bottomSpacer
          [style.padding-bottom]="bottomSpacerPx()"
        >
          <div class="settings-sections">
            @for (item of items; track item; let i = $index) {
              <m-disclosure
                class="settings-section"
                [class.settings-section--expanded]="expandedIndex() === i"
                [id]="computeId(i)"
                [label]="item"
                [expanded]="expandedIndex() === i"
                (toggled)="handleDisclosureToggle(i, $event)"
              >
                <ng-template mDisclosureTrigger>
                  <div
                    class="settings-trigger-wrapper"
                  >
                    <div
                      class="settings-trigger"
                    >
                      <div class="settings-trigger-label">
                        @switch (i) {
                          @case (0) {
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 640 640"
                              class="fill-current h-5 w-auto"
                              aria-hidden="true"
                            >
                              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                              <path
                                d="M64 464L144 464L144 400L304 400L304 464L576 464L576 496L304 496L304 560L144 560L144 496L64 496L64 464zM272 496L272 432L176 432L176 528L272 528L272 496zM64 304L336 304L336 240L496 240L496 304L576 304L576 336L496 336L496 400L336 400L336 336L64 336L64 304zM176 176L64 176L64 144L176 144L176 80L336 80L336 144L576 144L576 176L336 176L336 240L176 240L176 176zM208 176L208 208L304 208L304 112L208 112L208 176zM464 304L464 272L368 272L368 368L464 368L464 304z"
                              />
                            </svg>
                          }
                          @case (1) {
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 640 640"
                              class="fill-current h-5 w-auto"
                              aria-hidden="true"
                            >
                              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                              <path
                                d="M576 128L576 512L64 512L64 128L576 128zM64 96L32 96L32 544L608 544L608 96L64 96zM192 256C192 238.3 206.3 224 224 224C241.7 224 256 238.3 256 256C256 273.7 241.7 288 224 288C206.3 288 192 273.7 192 256zM288 256C288 220.7 259.3 192 224 192C188.7 192 160 220.7 160 256C160 291.3 188.7 320 224 320C259.3 320 288 291.3 288 256zM167.1 384L281 384L302.3 448L336 448L304 352L144 352L112 448L145.7 448L167 384zM384 224L368 224L368 256L528 256L528 224L384 224zM384 320L368 320L368 352L528 352L528 320L384 320z"
                              />
                            </svg>
                          }
                          @case (2) {
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 640 640"
                              class="fill-current h-5 w-auto"
                              aria-hidden="true"
                            >
                              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                              <path
                                d="M231.2 280L288 224L192 64L64 128L64 144C64 382.6 257.4 576 496 576L512 576L576 448L416 352L360 408.8C300.8 386 254 339.2 231.2 280zM421.1 392.4L534.1 460.2L492.2 544C274.3 542 98 365.7 96 147.8L179.8 105.9L247.6 218.9C217.7 248.4 199.8 266.1 193.8 272L201.3 291.6C227.3 359.2 280.8 412.7 348.4 438.7L368 446.2C373.9 440.2 391.6 422.3 421 392.4z"
                              />
                            </svg>
                          }
                          @case (3) {
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 640 640"
                              class="fill-current h-5 w-auto"
                              aria-hidden="true"
                            >
                              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                              <path
                                d="M320 64C373 64 416 107 416 160L416 224L224 224L224 160C224 107 267 64 320 64zM192 160L192 224L128 224L128 576L512 576L512 224L448 224L448 160C448 89.3 390.7 32 320 32C249.3 32 192 89.3 192 160zM160 256L480 256L480 544L160 544L160 256zM336 352L336 336L304 336L304 464L336 464L336 352z"
                              />
                            </svg>
                          }
                        }
                        <span><span class="settings-trigger-title">{{ item }}</span><span class="settings-trigger-description">{{ descriptions[i] }}</span></span>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        viewBox="0 0 640 640"
                        class="fill-current h-6 w-auto transition-transform duration-200"
                        [class.rotate-180]="expandedIndex() === i"
                        [class.rotate-0]="expandedIndex() !== i"
                      >
                        <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                        <path
                          d="M320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM331.3 411.3L320 422.6L308.7 411.3L196.7 299.3L185.4 288L208 265.4L219.3 276.7L320 377.4L420.7 276.7L432 265.4L454.6 288L443.3 299.3L331.3 411.3z"
                        />
                      </svg>
                    </div>
                  </div>
                </ng-template>
                <div class="settings-panel" animate.enter="settings-panel-enter">
                  @defer (when expandedIndex() === i) {
                    @switch (i) {
                      @case (0) {
                        <m-settings-overview-panel (securitySelected)="handleDisclosureToggle(3, true)" />
                      }
                      @case (1) {
                        <m-settings-profile-panel />
                      }
                      @case (2) {
                        <m-settings-contact-panel />
                      }
                      @case (3) {
                        <m-settings-security-panel />
                      }
                    }
                  } @placeholder {
                    <div class="min-h-24" aria-hidden="true"></div>
                  }
                </div>
              </m-disclosure>
            }
          </div>
        </div>
      </section>
    } @else {
      <div #pageTop class="main-container h-full" role="main" aria-busy="true" aria-live="polite">
        <div class="fixed inset-0 pointer-events-none">
          <div class="fixed top-1/2 -translate-y-1/2" [style.left.px]="spinnerLeft()" role="status">
            <m-progress-indicator />
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .settings-panel {
      interpolate-size: allow-keywords;
      overflow: hidden;
    }
    .settings-panel-enter {
      animation: settings-panel-open 300ms ease-out;
    }
    @keyframes settings-panel-open {
      from {
        height: 0;
        opacity: 0;
      }
      to {
        height: auto;
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .settings-panel-enter {
        animation: none;
      }
    }
  `,
  providers: [SettingsAccountFacade, SettingsSecurityFacade],
})
export class SettingsPageComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly scrollContext = inject(ScrollContextService)
  private readonly shellLayout = inject(ShellLayoutService)
  private readonly sidenavContext = inject(SidenavContextService)
  private readonly viewportRuntime = inject(ViewportRuntimeService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly resources = injectBrowserResourceOwner()
  readonly account = inject(SettingsAccountFacade)
  readonly disclosureItemHosts = viewChildren(DisclosureComponent, { read: ElementRef })
  readonly pageTop = viewChild<ElementRef<HTMLElement>>('pageTop')
  readonly bottomSpacer = viewChild<ElementRef<HTMLElement>>('bottomSpacer')
  readonly items = ['Generali', 'Anagrafica', 'Contatti', 'Sicurezza']
  readonly descriptions = ['Panoramica del tuo account', 'Informazioni personali e professionali', 'Indirizzo e-mail e numero di telefono', 'Password, sessioni e autenticazione']
  readonly expandedIndex = signal<number | null>(null)
  readonly spinnerLeft = signal(0)
  readonly bottomSpacerPx = signal('0px')
  private readonly anchors = ['general', 'personal_details', 'contact_details', 'security']
  private resizeObserver?: ResizeObserver
  private spinnerRaf?: number

  constructor() {
    effect((onCleanup) => {
      const index = this.expandedIndex()
      const hosts = this.disclosureItemHosts()
      const root = this.scrollContext.scrollRootRef()
      this.viewportRuntime.height()
      if (this.account.loading() || index === null || !hosts[index] || !root) return
      const timer = this.resources.setTimeout(() => this.scrollToDisclosure(index), 310)
      onCleanup(() => this.resources.clearTimeout(timer))
    })
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
    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fragment) => {
      this.applyFragment(fragment)
    })
    // Router restoration runs after initial rendering; align the section afterwards.
    this.router.events
      .pipe(filter(event => event instanceof Scroll), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const index = this.expandedIndex()
        if (index === null) return
        this.resources.setTimeout(() => {
          if (this.expandedIndex() === index && !this.account.loading()) this.scrollToDisclosure(index)
        }, 310)
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
      this.bottomSpacerPx.set('0px')
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
      this.bottomSpacerPx.set('0px')
      return
    }
    const index = Math.max(0, this.anchors.indexOf(fragment))
    this.expandedIndex.set(index)
    this.bottomSpacerPx.set('clamp(160px, 22vh, 360px)')
  }

  private scrollToDisclosure(index: number): void {
    const host = this.disclosureItemHosts()[index]?.nativeElement
    const root = this.scrollContext.scrollRootRef()
    if (!host || !root) return
    const trigger = host.querySelector('button') ?? host
    const y = Math.max(
      0,
      this.scrollContext.getScrollYRelativeToRoot(trigger, root.nativeElement) - this.shellLayout.headerHeight() - 12,
    )
    const scrollRoot = root.nativeElement
    const missingSpace = y - (scrollRoot.scrollHeight - scrollRoot.clientHeight)
    const spacer = this.bottomSpacer()?.nativeElement
    if (missingSpace > 0 && spacer) {
      const padding = parseFloat(getComputedStyle(spacer).paddingBottom) || 0
      this.bottomSpacerPx.set(`${padding + missingSpace + 1}px`)
      this.resources.requestAnimationFrame(() => {
        if (this.expandedIndex() === index) this.scrollContext.smoothTo(root, y, 240)
      })
      return
    }
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
