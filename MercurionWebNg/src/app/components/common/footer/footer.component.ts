import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { PublicPipe } from '../../../pipes/public.pipe';
import { environment } from '../../../../environments/environment.development';
import { RouterLink } from '@angular/router';

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
    <footer class="px-6 py-4 text-xs sm:text-sm">
      <!-- classi tw rimosse per passaggio a footer minimalista bg-slate-100 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-200 border-t border-slate-400/40 dark:border-slate-400/65 -->
      <div
        class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center sm:text-left"
      >
        <!-- Brand + copyright -->
        <p class="tracking-wide flex flex-col sm:flex-row md:flex-row items-center gap-4">
          <img
            [ngSrc]="logoSrc() | public"
            alt="Mercurion Pictogram"
            priority="true"
            width="186"
            height="234"
            class="w-[23px] h-auto contrast-115"
          />
          <span>&copy; {{year}} Mercurion. Tutti i diritti riservati.</span>
        </p>

        <!-- Link essenziali -->
        <div class="flex flex-wrap justify-center sm:justify-end gap-x-6 gap-y-2">
          <a
            routerLink="/privacy"
            class="hover:underline dark:hover:no-underline hover:text-slate-600 dark:hover:text-slate-50/70 transition"
            >Privacy</a
          >
          <a
            routerLink="/terms-and-policies"
            class="hover:underline dark:hover:no-underline hover:text-slate-600 dark:hover:text-slate-50/70 transition"
            >Termini e Policy</a
          >
          <a
            routerLink="/contacts"
            class="hover:underline dark:hover:no-underline hover:text-slate-600 dark:hover:text-slate-50/70 transition"
            >Contatti</a
          >
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent implements OnInit {

  private readonly themeManager = inject(ThemeManagerService)

  protected year!: number

  protected logoSrc = signal<string>('')

  constructor() {
    const { PICTOGRAM_LIGHT, PICTOGRAM_DARK } = environment.logoSrc
    effect(() => this.logoSrc.set(this.themeManager.theme() === 'dark' ? PICTOGRAM_DARK : PICTOGRAM_LIGHT))
  }

  ngOnInit(): void {
    const now = new Date()
    this.year = now.getFullYear()
  }

}
