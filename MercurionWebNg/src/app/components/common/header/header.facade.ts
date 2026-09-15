import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { UserContextService } from '../../../services/context/user-context.service';
import { AccountService } from '../../../services/account.service';
import { routeManifest } from '../../../route-manifest';
import { ProvidedEmailDTO } from '../../../Models/account/account.models';
import { HeaderViewModel } from './header.models';

/**
 * The header is a composition shell.  This facade is the only place where
 * shell state is assembled from application services; children receive the
 * resulting view model and emit semantic events.
 */
@Injectable()
export class HeaderFacade {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly themeManager = inject(ThemeManagerService);
  private readonly userContext = inject(UserContextService);
  private readonly accountService = inject(AccountService);
  private readonly path = signal(this.router.url);
  private readonly email = signal<ProvidedEmailDTO | null>(null);

  readonly viewModel = computed<HeaderViewModel>(() => {
    const currentPath = this.cleanPath(this.path());
    const loggedIn = this.userContext.isLoggedIn();
    return {
      navigation: [],
      session: {
        loggedIn,
        initials: this.userContext.initials(),
        email: this.email()
      },
      theme: this.themeManager.theme(),
      loginPath: currentPath.startsWith(`/${routeManifest.login.path}`),
      registerPath: currentPath === routeManifest.register.build({}),
      welcomePath: currentPath.startsWith(`/${routeManifest.welcome.path}`),
      allowedPath: ![routeManifest.login.build({}), routeManifest.home.build({})].includes(currentPath)
    };
  });

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => {
      this.path.set((event as NavigationEnd).urlAfterRedirects);
    });
    effect(() => {
      if (this.userContext.isLoggedIn()) {
        this.accountService.getProvidedEmail()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(value => this.email.set(value));
      } else {
        this.email.set(null);
      }
    });
  }

  chooseTheme(theme: Parameters<ThemeManagerService['chooseTheme']>[0]): void {
    this.themeManager.chooseTheme(theme);
  }

  private cleanPath(path: string): string {
    return (path || '').split(/[?#;]/)[0];
  }
}
