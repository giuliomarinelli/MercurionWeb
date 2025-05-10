import { NgClass, NgOptimizedImage } from '@angular/common';
import { ApplicationRef, ChangeDetectorRef, Component, computed, effect, OnChanges, OnDestroy, OnInit, Signal, signal, SimpleChanges, WritableSignal } from '@angular/core';
import { ThemeManagerService } from '../../../services/stores/theme-manager.service';
import { ThemeChose } from '../../../Models/types/theme-types';
import { DesignService } from '../../../services/design.service';
import { NavComponent } from '../nav/nav.component';
import { SearchContextService } from '../../../services/stores/search-context.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { PublicPipe } from '../../../pipes/public.pipe';
import { UserContextService } from '../../../services/stores/user-context.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [
    NgOptimizedImage,
    NgClass,
    NavComponent,
    RouterLink,
    PublicPipe
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {

  // Signal derivato per logoSrc
  readonly logoSrc = computed(() =>
    this.themeManager.theme() === 'light' ? 'logo/complete-light-logo.svg' : 'logo/complete-dark-logo-2.svg'
  )
  readonly isLoggedIn = computed(() => {
    const initials = this.userContext.initials()
    return initials.length === 1 || initials.length === 2
  })
  isAllowedRoute: boolean = false
  private routeSub: Subscription | undefined

  constructor(
    protected readonly themeManager: ThemeManagerService,
    protected readonly designService: DesignService,
    protected readonly searchContextService: SearchContextService,
    protected readonly userContext: UserContextService,
    private readonly router: Router,
    private readonly appRef: ApplicationRef,
    private readonly cdRef: ChangeDetectorRef
  ) {
    effect(() => {
      const initials = this.userContext.initials()
      this.cdRef.detectChanges()  // Forza Angular a rinfrescare la vista
    })
    effect(() => console.log('[header] initials =', this.userContext.initials()));
    effect(() => console.log('[header] isLoggedIn =', this.isLoggedIn()));
  }

  protected onThemeChange(theme: ThemeChose): void {
    queueMicrotask(() => {
      this.themeManager.chooseTheme(theme)
      console.log(this.themeManager.theme())
    })
  }

  protected themeMenuOpen: WritableSignal<boolean> = signal(false)
  protected offCanvasMenuOpen: WritableSignal<boolean> = signal(false)

  readonly menuOpenClass: Signal<boolean> = computed(() => this.themeMenuOpen())

  protected toggleThemeMenu(): void {
    this.themeMenuOpen.update(open => !open)
  }

  protected toggleOffCanvasMenu(): void {
    this.offCanvasMenuOpen.update(open => !open)
  }

  protected closeOffCanvasMenu(): void {
    this.offCanvasMenuOpen.set(false)
  }

  protected closeThemeMenu(): void {
    this.themeMenuOpen.set(false)
  }

  protected handleDocumentClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement

    const isInsideThemeMenu = target.closest('.theme-menu-container')
    const isToggleThemeBtn = target.closest('.theme-toggle-button')
    const isInsideOffCanvasMenu = target.closest('.off-canvas-menu-container')
    const isToggleOffCanvasBtn = target.closest('.off-canvas-menu-button')

    if (!isInsideThemeMenu && !isToggleThemeBtn) {
      this.themeMenuOpen.set(false)
    }

    if (!isInsideOffCanvasMenu && !isToggleOffCanvasBtn) {
      this.offCanvasMenuOpen.set(false)
    }
  }

  protected handleEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.themeMenuOpen.set(false)
      this.offCanvasMenuOpen.set(false)
    }
  }

  openSearchOverlay(): void {
    this.searchContextService.isOpenedSearchOverlay.set(true)
  }




  ngOnInit(): void {
    document.addEventListener('click', this.handleDocumentClick, true)
    document.addEventListener('keydown', this.handleEscape, true)
    this.routeSub = this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd)
      )
      .subscribe((e: NavigationEnd) => {
        const currentPath = e.urlAfterRedirects
        const notAllowedPaths: string[] = ['/login', '/', '/test/spinner']
        this.isAllowedRoute = !notAllowedPaths.includes(currentPath)
        this.appRef.tick()
      })
  }



  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleDocumentClick, true)
    document.removeEventListener('keydown', this.handleEscape, true)
    this.routeSub?.unsubscribe()
  }


}
