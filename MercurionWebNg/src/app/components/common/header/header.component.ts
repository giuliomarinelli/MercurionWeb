import { NgClass, NgOptimizedImage } from '@angular/common';
import { ApplicationRef, ChangeDetectorRef, Component, computed, effect, OnDestroy, OnInit, Signal, signal } from '@angular/core';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { ThemeChoice } from '../../../Models/theme.models';
import { DesignService } from '../../../services/design.service';
import { NavComponent } from '../nav/nav.component';
import { SearchContextService } from '../../../services/context/search-context.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { PublicPipe } from '../../../pipes/public.pipe';
import { UserContextService } from '../../../services/context/user-context.service';
import { filter, Subscription } from 'rxjs';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { AccountService } from '../../../services/account.service';
import { AuthService } from '../../../services/auth.service';
import { SessionSyncService } from '../../../services/session-sync.service';
import { PathService } from '../../../services/path.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-header',
  imports: [
    NgOptimizedImage,
    NgClass,
    NavComponent,
    RouterLink,
    PublicPipe,
    SidenavComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {

  private routeSub: Subscription | undefined
  private emailSub: Subscription | undefined
  private logoutSub: Subscription | undefined
  protected isLoginPath = signal<boolean>(true)
  protected isRegisterPath = signal<boolean>(false)
  protected isAllowedPath = signal<boolean>(false)
  protected themeMenuOpen = signal<boolean>(false)
  protected themeMenuMounted = signal<boolean>(false)
  protected themeMenuVisible = signal<boolean>(false)
  protected offCanvasMenuOpen = signal<boolean>(false)
  protected avatarMenuOpen = signal<boolean>(false)
  protected avatarMenuMounted = signal<boolean>(false)
  protected avatarMenuVisible = signal<boolean>(false)
  protected avatarMobileMenuOpen = signal<boolean>(false)
  protected avatarMobileMenuMounted = signal<boolean>(false)
  protected avatarMobileMenuVisible = signal<boolean>(false)
  protected email = signal<string>('')

  readonly menuOpenClass: Signal<boolean> = computed(() => this.themeMenuOpen())
  readonly logoSrc = computed(() =>
    this.themeManager.theme() === 'light' ? 'logo/complete-light-logo.svg' : 'logo/complete-dark-logo-2.svg'
  )


  constructor(
    protected readonly themeManager: ThemeManagerService,
    protected readonly designService: DesignService,
    protected readonly searchContextService: SearchContextService,
    protected readonly sessionSync: SessionSyncService,
    private readonly router: Router,
    private accountService: AccountService,
    private readonly authService: AuthService,
    protected readonly userContext: UserContextService,
    protected readonly pathService: PathService,
    private readonly toast: ToastService
  ) {
    effect(() => {
      if (this.themeMenuOpen()) {
        this.themeMenuMounted.set(true)
        setTimeout(() => this.themeMenuVisible.set(true))
      } else {
        this.themeMenuVisible.set(false)
        setTimeout(() => this.themeMenuMounted.set(false), 200)
      }
    })
    effect(() => {
      if (this.avatarMenuOpen()) {
        this.avatarMenuMounted.set(true)
        setTimeout(() => this.avatarMenuVisible.set(true))
      } else {
        this.avatarMenuVisible.set(false)
        setTimeout(() => this.avatarMenuMounted.set(false), 200)
      }
    })
    effect(() => {
      if (this.avatarMobileMenuOpen()) {
        this.avatarMobileMenuMounted.set(true)
        setTimeout(() => this.avatarMobileMenuVisible.set(true))
      } else {
        this.avatarMobileMenuVisible.set(false)
        setTimeout(() => this.avatarMobileMenuMounted.set(false), 200)
      }
    })
  }

  protected onThemeChange(theme: ThemeChoice): void {
    queueMicrotask(() => {
      this.themeManager.chooseTheme(theme)
      console.log(this.themeManager.theme())
    })
  }


  protected toggleThemeMenu(): void {
    this.themeMenuOpen.update(open => !open)
  }

  protected toggleOffCanvasMenu(): void {
    this.getEmail()
    this.offCanvasMenuOpen.update(open => !open)
  }

  protected toggleAvatarMenu(): void {
    !this.avatarMenuOpen() && this.getEmail()
    this.themeMenuOpen() && this.toggleThemeMenu()
    this.avatarMenuOpen.update(open => !open)
  }

  protected toggleAvatarMobileMenu(): void {
    !this.avatarMobileMenuOpen() && this.getEmail()
    this.themeMenuOpen() && this.toggleThemeMenu()
    this.avatarMobileMenuOpen.update(open => !open)
  }

  protected closeOffCanvasMenu(): void {
    this.offCanvasMenuOpen.set(false)
  }

  protected closeThemeMenu(): void {
    this.themeMenuOpen.set(false)
  }

  protected closeAvatarMenu(): void {
    this.avatarMenuOpen.set(false)
  }

  protected closeAvatarMobileMenu(): void {
    this.avatarMobileMenuOpen.set(false)
  }

  protected noToast(): void {
    this.toast.close()
  }

  protected handleDocumentClick = (event: MouseEvent): void => {

    if (this.avatarMobileMenuMounted()) {
      return
    }

    const target = event.target as HTMLElement

    const isInsideThemeMenu = target.closest('.theme-menu-container')
    const isInsideAvatarMenu = target.closest('.avatar-menu-container')
    const isInsideAvatarBtn = target.closest('.avatar-toggle-button')
    const isToggleThemeBtn = target.closest('.theme-toggle-button')
    const isInsideOffCanvasMenu = target.closest('.off-canvas-menu-container')
    const isToggleOffCanvasBtn = target.closest('.off-canvas-menu-button')

    if (!isInsideThemeMenu && !isToggleThemeBtn) {
      this.themeMenuOpen.set(false)
    }

    if (!isInsideOffCanvasMenu && !isToggleOffCanvasBtn) {
      this.offCanvasMenuOpen.set(false)
    }

    if (!isInsideAvatarMenu && !isInsideAvatarBtn) {
      this.avatarMenuOpen.set(false)
    }

  }

  protected handleEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.themeMenuOpen.set(false)
      this.offCanvasMenuOpen.set(false)
      this.avatarMenuOpen.set(false)
      this.avatarMobileMenuVisible.set(false)
    }
  }

  openSearchOverlay(): void {
    this.searchContextService.isOpenedSearchOverlay.set(true)
  }

  getEmail(): void {
    this.emailSub = this.accountService
      .getEmail()
      .subscribe(email => {
        this.email.set(email)
      })
  }

  logout(): void {
    this.logoutSub = this.authService.logout().subscribe({
      next: () => {
        sessionStorage?.removeItem('RouteError')
        localStorage?.removeItem('login')
        this.sessionSync.logout()
        this.offCanvasMenuOpen.set(false)
      },
      error: () => {
        sessionStorage?.removeItem('RouteError')
        this.sessionSync.logout()
        this.offCanvasMenuOpen.set(false)
      }
    })
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
        this.isAllowedPath.set(!notAllowedPaths.includes(currentPath))
        this.isLoginPath.set(currentPath === '/login')
        this.isRegisterPath.set(currentPath === '/register')
      })

  }



  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleDocumentClick, true)
    document.removeEventListener('keydown', this.handleEscape, true)
    this.routeSub?.unsubscribe()
    this.emailSub?.unsubscribe()
    this.logoutSub?.unsubscribe()
  }


}
