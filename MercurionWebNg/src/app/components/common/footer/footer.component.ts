import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { PublicPipe } from '../../../pipes/public.pipe';
import { environment } from '../../../../environments/environment';
import { RouterLink } from '@angular/router';
import { APP_CONFIG } from '../../../config/app-config';

@Component({
  selector: 'm-footer',
  standalone: true,
  imports: [
    NgOptimizedImage,
    PublicPipe,
    RouterLink
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<footer class="mt-8 relative isolate pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]" role="contentinfo">
  <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 bg-slate-300/30 dark:bg-slate-800/50 backdrop-blur-md"></div>
  <div class="max-w-7xl mx-auto flex min-w-0 flex-col gap-3 text-left md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6">
    <!-- Brand + copyright -->
    <div class="flex min-w-0 items-start gap-3 sm:items-center md:flex-1 md:basis-96">
      <img [ngSrc]="logoSrc() | public" alt="Mercurion Pictogram" priority="true" width="186" height="234"
        class="w-6 h-auto shrink-0 contrast-100" />
      <div class="flex min-w-0 flex-col gap-1 leading-relaxed sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
        <p>&copy; {{year}} Mercurion. Tutti i diritti riservati.</p>
        <p class="inline-flex items-center gap-2">
          <svg
            aria-hidden="true"
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            class="size-4 shrink-0"
          >
            <!-- Parte destra / superiore -->
            <path class="fill-current text-light-accent-secondary dark:text-dark-accent-secondary-hc"
              d="
                M576 64
                L184.5 161.9
                L491.7 469.1
                L576 448
                L384 256
                L576 64
                Z
              "
            />

            <!-- Parte sinistra / inferiore -->
            <path class="fill-current text-light-accent-primary dark:text-dark-accent-primary"
              d="
                M148.3 170.9
                L64 192
                L256 384
                L64 576
                L455.5 478.1
                L148.3 170.9
                Z
              "
            />
          </svg>
          <span>Powered by <a class="a whitespace-nowrap" href="https://giuliomarinelli.com" target="_blank" rel="noopener noreferrer">GM Web Tech Lab</a></span>

        </p>
      </div>

    </div>

    <!-- Link essenziali -->
    <nav aria-label="Informazioni e documenti" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-on-surface-main">
      <a routerLink="/privacy"
        class="inline-flex min-h-11 items-center py-2 hover:underline dark:hover:no-underline hover:text-slate-600 dark:hover:text-slate-50/70 transition">Privacy</a>
      <a routerLink="/terms-and-policies"
        class="inline-flex min-h-11 items-center py-2 hover:underline dark:hover:no-underline hover:text-slate-600 dark:hover:text-slate-50/70 transition">Termini
        e Policy</a>
      <a routerLink="/contacts"
        class="inline-flex min-h-11 items-center py-2 hover:underline dark:hover:no-underline hover:text-slate-600 dark:hover:text-slate-50/70 transition">Contatti</a>
    </nav>
  </div>
</footer>
  `
})
export class FooterComponent implements OnInit {

  private readonly themeManager = inject(ThemeManagerService)
  protected readonly appConfig = inject(APP_CONFIG)

  protected year = new Date().getFullYear()

  protected logoSrc = signal<string>('')

  constructor() {
    const { PICTOGRAM_LIGHT, PICTOGRAM_DARK } = environment.logoSrc
    effect(() => this.logoSrc.set(this.themeManager.theme() === 'dark' ? PICTOGRAM_DARK : PICTOGRAM_LIGHT))
  }

  ngOnInit(): void {
    this.year = new Date().getFullYear()
  }
}
