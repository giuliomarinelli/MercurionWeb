import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { ProgressIndicatorComponent } from '../../components/common/progress-indicator/progress-indicator.component';
import { ButtonComponent } from '../../components/common/button/button.component';
import { UserContextService } from '../../services/context/user-context.service';
import { ThemeManagerService } from '../../services/context/theme-manager.service';
import { environment } from '../../../environments/environment';
import { AppShellFacade } from '../../services/app-shell.facade';


@Component({
  selector: 'm-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, ProgressIndicatorComponent, ButtonComponent],
  styles: `
    @reference "../../../styles.css";
    @keyframes letter-appears-kf {
      from {
        opacity: 0;
        transform: translateY(-30px) translateX(-18px) rotateX(-40deg);
      }
      to {
        opacity: 1;
        transform: translateY(0) translateX(0) rotateX(0);
      }
    }
    @keyframes scale-up-kf {
      from {
        transform: scale(1);
      }
      to {
        transform: scale(1.2);
      }
    }
    .letter-appears {
      animation: letter-appears-kf 0.65s ease both;
    }
    .bg {
      @apply bg-slate-300 dark:bg-slate-900;
    }
  `,
  template: `
    <main class="bg min-h-dvh flex justify-center items-center px-6 py-12">
      @if (showProgress()) {
        <m-progress-indicator />
      } @else {
        <section class="flex w-full max-w-3xl flex-col items-center gap-6">
          <h1 class="tracking-widest text-center font-semibold text-[clamp(1.75rem,7vw,6rem)]">
            @for (letter of mercurionLetters; track $index; let i = $index) {
              <span class="inline-block" [class.letter-appears]="!skipAnimations" [style.animation-delay.ms]="skipAnimations ? null : i * 750" [ngClass]="{
                'text-light-accent-primary-hq dark:text-dark-accent-primary': i === 0,
                'text-light-accent-primary-hq dark:text-slate-50': i > 0 && i < mercurionLetters.length - 1,
                'text-light-accent-secondary dark:text-dark-accent-secondary': i === mercurionLetters.length - 1
              }">{{ letter }}</span>
            }
          </h1>
          <span class="flex justify-center" [class.letter-appears]="!skipAnimations" [style.animation-delay.ms]="skipAnimations ? null : mercurionLetters.length * 750">
            <img [src]="logoSrc()" alt="Mercurion Logo" class="w-20 h-auto mb-6" />
          </span>
          <div class="grid w-full max-w-2xl grid-cols-1 sm:grid-cols-3 gap-4" [class.letter-appears]="!skipAnimations" [style.animation-delay.ms]="skipAnimations ? null : (mercurionLetters.length + 1) * 750">
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
  protected readonly skipAnimations = inject(AppShellFacade).shouldSkipHomeAnimations()

  protected readonly mercurionLetters = [...'Mercurion.']
  protected readonly showProgress = computed(() => this.userCtx.isLoggedIn() || this.userCtx.isRestoringSession())
  readonly logoSrc = () => {
    const { PICTOGRAM_LIGHT, PICTOGRAM_DARK } = environment.logoSrc
    return this.themeManager.theme() === 'light' ? PICTOGRAM_LIGHT : PICTOGRAM_DARK
  }

}
