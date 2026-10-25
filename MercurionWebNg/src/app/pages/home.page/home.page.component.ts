import { Component, computed, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { ProgressIndicatorComponent } from '../../components/common/progress-indicator/progress-indicator.component';
import { ButtonComponent } from '../../components/common/button/button.component';
import { UserContextService } from '../../services/context/user-context.service';
import { ThemeManagerService } from '../../services/context/theme-manager.service';
import { environment } from '../../../environments/environment';
import { AppShellFacade } from '../../services/app-shell.facade';


@Component({
  selector: 'm-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressIndicatorComponent, ButtonComponent],
  styleUrl: './home.page.component.css',
  template: `
    <main class="home">
      @if (showProgress()) {
        <m-progress-indicator />
      } @else {
        <section class="home__content" aria-labelledby="home-title" [class.home--intro]="!skipAnimations">
          <div class="home__identity" aria-hidden="true">
            <svg class="home__orbit" viewBox="0 0 200 200" fill="none" focusable="false">
              <path d="M100 16 173 58v84l-73 42-73-42V58Z" />
              <path d="m100 36 55 32v64l-55 32-55-32V68Z" />
              <circle cx="100" cy="16" r="4" /><circle cx="173" cy="142" r="4" /><circle cx="27" cy="142" r="4" />
            </svg>
            <img [src]="logoSrc()" alt="" width="80" height="104" class="home__logo" />
          </div>
          <p class="home__eyebrow">Next Gen Chemistry.</p>
          <h1 id="home-title" class="home__title" aria-label="Mercurion">
            @for (letter of mercurionLetters; track $index; let i = $index) {
              <span aria-hidden="true" [style.animation-delay.ms]="skipAnimations ? null : i * 35">{{ letter }}</span>
            }
          </h1>
          <p class="home__description">Esplora e disegna strutture molecolari, costruisci le tue collezioni.</p>
          <div class="home__actions">
            <m-button variant="outline" size="lg" [fullWidth]="true" routerLink="/welcome">
              Scopri Mercurion
            </m-button>
            <m-button variant="primary" size="lg" [fullWidth]="true" routerLink="/login">
              Accedi
            </m-button>
            <m-button variant="secondary" size="lg" [fullWidth]="true" routerLink="/register">
              Registrati
            </m-button>
          </div>
        </section>
      }
    </main>
  `,
})
export class HomePageComponent {

  private readonly userCtx = inject(UserContextService)
  private readonly themeManager = inject(ThemeManagerService)
  private readonly shell = inject(AppShellFacade)
  protected readonly skipAnimations = this.shell.shouldSkipHomeAnimations()

  protected readonly mercurionLetters = [...'Mercurion.']
  protected readonly showProgress = computed(() => this.userCtx.isLoggedIn() || this.userCtx.isRestoringSession())
  constructor() {
    effect(() => {
      if (!this.showProgress()) this.shell.markHomePresented()
    })
  }
  readonly logoSrc = () => {
    const { PICTOGRAM_LIGHT, PICTOGRAM_DARK } = environment.logoSrc
    return this.themeManager.theme() === 'light' ? PICTOGRAM_LIGHT : PICTOGRAM_DARK
  }

}
