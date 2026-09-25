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
<footer class="px-6 py-4 text-xs sm:text-sm bg-slate-300/30 dark:bg-slate-800/50 backdrop-blur-md" role="contentinfo">
  <!-- classi tw rimosse per passaggio a footer minimalista bg-slate-100 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-200 border-t border-slate-400/40 dark:border-slate-400/65 -->
  <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center sm:text-left">
    <!-- Brand + copyright -->
    <p class="tracking-wide flex flex-col sm:flex-row md:flex-row items-center gap-4">
      <img [ngSrc]="logoSrc() | public" alt="Mercurion Pictogram" priority="true" width="186" height="234"
        class="w-[23px] h-auto contrast-100" />
      <span>
        &copy; {{year}} Mercurion. Tutti i diritti riservati ─
        <span>
          <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
            class="relative -top-0.5 inline-block fill-current size-5 align-middle">
            <!--!Font Awesome Pro v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.-->
            <path
              d="M576 64L184.5 161.9L491.7 469.1L576 448L384 256L576 64zM148.3 170.9L64 192L256 384L64 576L455.5 478.1L148.3 170.9z" />
          </svg>
          <span class="pl-2">Powered by <a class="a" href="https://giuliomarinelli.com" target="_blank" rel="noopener noreferrer">GM Web Tech Lab</a></span>

        </span>
      </span>

    </p>

    <!-- Link essenziali -->
    <div
      class="flex flex-col xs:flex-row flex-wrap justify-center sm:justify-end items-center gap-y-2 xs:gap-y-2 gap-x-6">
      <a routerLink="/privacy"
        class="hover:underline dark:hover:no-underline hover:text-slate-600 dark:hover:text-slate-50/70 transition">Privacy</a>
      <a routerLink="/terms-and-policies"
        class="hover:underline dark:hover:no-underline hover:text-slate-600 dark:hover:text-slate-50/70 transition">Termini
        e Policy</a>
      <a routerLink="/contacts"
        class="hover:underline dark:hover:no-underline hover:text-slate-600 dark:hover:text-slate-50/70 transition">Contatti</a>
    </div>
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
