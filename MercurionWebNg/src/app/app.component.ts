import {
  AfterViewInit,
  Component,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  signal,
  Signal,
  inject,
  PLATFORM_ID,
  viewChild
} from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { HeaderComponent } from './components/common/header/header.component'
import { ThemeManagerService } from './services/context/theme-manager.service'
import { SearchOverlayComponent } from './components/search-overlay/search-overlay/search-overlay.component'
import { SearchContextService } from './services/context/search-context.service'
import { FooterComponent } from './components/common/footer/footer.component'
import { ToastService } from './services/toast.service'
import { AuthStateStore } from './services/auth-state.store'
import { SidenavContextService } from './services/context/sidenav-context.service'
import { DesignService } from './services/design.service'
import { SidenavComponent } from './components/common/sidenav/sidenav.component'
import { AppShellFacade } from './services/app-shell.facade'
import { ActionOverlayContextService } from './services/context/action-context/action-overlay-context.service'
import { ActionOverlayComponent } from './components/action-components/action-overlay/action-overlay.component'
import { AppContextService } from './services/context/app-context.service'
import { DOCUMENT, isPlatformBrowser } from '@angular/common'
import { ToastComponent } from './components/common/toast/toast.component'

@Component({
  selector: 'm-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    RouterOutlet,
    HeaderComponent,
    SearchOverlayComponent,
    FooterComponent,
    ToastComponent,
    SidenavComponent,
    ActionOverlayComponent
  ],
  template: `
    @if (isSafari) {
      <div class="bg-amber-200/90 text-amber-900 px-3 py-2 text-sm flex items-center justify-center gap-2">
        <span class="font-semibold">Avviso Safari</span>
        <span>Safari mobile può non rispettare gli standard web: se riscontri problemi, prova un browser differente. Allineeremo il supporto a Safari appena possibile.</span>
      </div>
    }
    @if (routePolicy().shell === 'standard') {
      <div class="flex flex-col h-screen">
        <m-header class="sticky top-0 z-30"
          [triggerOpenOffCanvas]="_triggerOpenOffCanvas()"
          (onOffCanvasMenuOpen)="triggerOpenOffCanvas()" />
        <div class="drawer-container relative flex flex-1 overflow-hidden custom-scrollbar">
          @if (authState.authenticated() && design.minBk('xl')()) {
            <div class="absolute top-4 left-[10px] z-30 group">
              <button class="cursor-pointer hover:transform hover:scale-[1.05] transition-transform duration-300" (click)="sidenavContext.toggle()" aria-label="Sidebar">
                @if (sidenavContext.isVisible()) {
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-auto text-light-on-surface-main hover:text-light-on-surface-secondary dark:text-dark-on-surface-main hover:dark:text-dark-on-surface-secondary transition-colors duration-150">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 3v18" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-auto text-light-on-surface-main hover:text-light-on-surface-secondary dark:text-dark-on-surface-main hover:dark:text-dark-on-surface-secondary transition-colors duration-150">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <rect x="3" y="3" width="6" height="18" rx="2" fill="currentColor" stroke="none"/>
                  </svg>
                }
              </button>
              <span
                class="absolute left-20 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded
                       bg-neutral-900/90 dark:bg-neutral-100/90 px-2 py-1 text-xs text-neutral-50
                       dark:text-neutral-900 opacity-0 group-hover:opacity-100
                       transition-opacity duration-150 pointer-events-none z-40 shadow-lg"
                role="tooltip">
                @if (sidenavContext.isVisible()) {
                  Nascondi barra laterale
                } @else {
                  Mostra barra laterale
                }
              </span>
            </div>
          }
          @if (sidenavContext.isMounted() && authState.authenticated() && design.minBk('xl')()) {
            <aside
              class="drawer absolute inset-y-0 left-0 w-64
                transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                -translate-x-full"
              [class.translate-x-0]="sidenavContext.isVisible()"
              [class.-translate-x-full]="!sidenavContext.isVisible()">
              <m-sidenav />
            </aside>
          }
          <section #scrollHost
            class="content flex flex-col flex-1 overflow-y-auto transition-[margin] duration-500 m-scroll-thin"
            [class.ml-64]="sidenavContext.isOpen() && authState.authenticated() && design.minBk('xl')()">
            <main class="flex-1 p-4 block">
              <router-outlet />
            </main>
            <m-footer class="shrink-0" />
          </section>
        </div>
      </div>
      @if (searchContextService.isMounted()) {
        @defer (when searchContextService.isMounted()) {
          <m-search-overlay />
        }
      }
      @if (saveOverlayContext.shouldMount() && authState.authenticated()) {
        @defer (when saveOverlayContext.shouldMount()) {
          <m-action-overlay />
        }
      }
    } @else {
      <div class="min-h-screen">
        @if (routePolicy().shell === 'welcome') {
          <m-header class="sticky top-0 z-30" />
        }
        <router-outlet />
      </div>
    }
    <m-toast />
  `
})
export class AppComponent implements AfterViewInit, OnDestroy {

  protected readonly isSafari: boolean

  private readonly themeManagerService = inject(ThemeManagerService)
  protected readonly searchContextService = inject(SearchContextService)
  private readonly shell = inject(AppShellFacade)
  protected readonly toastService = inject(ToastService)
  protected readonly authState = inject(AuthStateStore)
  protected readonly sidenavContext = inject(SidenavContextService)
  protected readonly design = inject(DesignService)
  protected readonly saveOverlayContext = inject(ActionOverlayContextService)
  private readonly appContext = inject(AppContextService)
  private readonly doc = inject(DOCUMENT)
  private readonly platformId = inject(PLATFORM_ID)
  private readonly isBrowser = isPlatformBrowser(this.platformId)

  isDarkTheme: Signal<boolean> = computed(() => this.themeManagerService.theme() === 'dark')
  readonly routePolicy = this.shell.routePolicy

  _triggerOpenOffCanvas = signal<boolean>(false)

  readonly scrollHost = viewChild<ElementRef<HTMLElement>>('scrollHost')
  private scrollHostRef?: ElementRef<HTMLElement>

  readonly headerRef = viewChild.required(HeaderComponent, { read: ElementRef });

  constructor() {
    const isBrowser = this.isBrowser
    this.isSafari = isBrowser && /safari\//i.test(navigator.userAgent) && !/chrome\//i.test(navigator.userAgent)
    if (isBrowser) {
      this.doc.documentElement.classList.add('m-scroll-thin')
    }
    effect(() => {
      this.scrollHostRef = this.scrollHost()
      this.shell.registerScrollHost(this.scrollHostRef)
      // wait a tick so the view is stable before registering the new root
      queueMicrotask(() => this.ensureScrollRootRef())
    })
    effect(() => {
      this.routePolicy()
      this.appContext.addedGlobalScrollRootRefTick()
      queueMicrotask(() => this.ensureScrollRootRef())
    })
  }

  triggerOpenOffCanvas(): void {
    this._triggerOpenOffCanvas.set(true)
  }

  ngAfterViewInit() {
    queueMicrotask(() => {
      this.ensureScrollRootRef()
      const h = this.headerRef()?.nativeElement?.offsetHeight ?? 64
      this.appContext.setHeaderHeight(h)
    })
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      this.doc.documentElement.classList.remove('m-scroll-thin')
    }
  }

  private ensureScrollRootRef(): void {
    if (!this.isBrowser) return

    const docEl = this.doc?.documentElement as HTMLElement | null
    const shouldUseScrollHost = this.routePolicy().shell === 'standard' && !!this.scrollHostRef

    if (shouldUseScrollHost) {
      this.appContext.setGlobalScrollRootRef(this.scrollHostRef!)
      return
    }

    if (docEl) {
      this.appContext.setGlobalScrollRootRef(new ElementRef<HTMLElement>(docEl))
    }
  }
}
