import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PublicPipe } from '../../../pipes/public.pipe';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';

@Component({
  selector: 'm-welcome-screenshot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PublicPipe],
  styles: ':host { display: block; min-width: 0; }',
  template: `
    <a [href]="source() | public" target="_blank" rel="noopener noreferrer"
      [attr.aria-label]="alt() + ' Apri a dimensione intera (si apre in una nuova scheda).'"
      class="block rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent-primary">
      <img [src]="source() | public" [alt]="alt()" [width]="width()" [height]="height()"
        [attr.loading]="loading()" [attr.fetchpriority]="loading() === 'eager' ? 'high' : 'auto'"
        decoding="async" class="block h-auto w-full" />
      <span class="flex min-h-11 items-center justify-end gap-2 border-t border-slate-200/80 bg-slate-50/95 px-3 py-2 text-xs font-medium text-light-accent-primary-hc dark:border-slate-700/70 dark:bg-slate-900/95 dark:text-dark-accent-primary-btn-hc">
        Apri a dimensione intera <span aria-hidden="true">↗</span>
      </span>
    </a>
  `,
})
export class WelcomeScreenshotComponent {
  private readonly theme = inject(ThemeManagerService);
  readonly lightSrc = input.required<string>();
  readonly darkSrc = input.required<string>();
  readonly alt = input.required<string>();
  readonly width = input.required<number>();
  readonly height = input.required<number>();
  readonly loading = input<'eager' | 'lazy'>('lazy');
  protected readonly source = computed(() => this.theme.theme() === 'dark' ? this.darkSrc() : this.lightSrc());
}
