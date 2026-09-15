import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SkeletonShape = 'text' | 'rect' | 'circle';

@Component({
  selector: 'm-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="m-skeleton"
      [class.m-skeleton--text]="shape() === 'text'"
      [class.m-skeleton--rect]="shape() === 'rect'"
      [class.m-skeleton--circle]="shape() === 'circle'"
      [style.width]="width()"
      [style.height]="height()"
      [attr.aria-hidden]="label() ? null : 'true'"
      [attr.role]="label() ? 'status' : null"
      [attr.aria-label]="label() || null"
    >{{ label() }}</span>
  `,
  styles: [`
    :host { display: block; }
    .m-skeleton {
      animation: m-skeleton-shimmer 1.6s ease-in-out infinite;
      background: linear-gradient(90deg, rgb(226 232 240 / .8), rgb(241 245 249 / .95), rgb(226 232 240 / .8));
      background-size: 200% 100%;
      display: block;
      min-height: .75rem;
    }
    .m-skeleton--text { border-radius: .375rem; }
    .m-skeleton--rect { border-radius: .75rem; }
    .m-skeleton--circle { border-radius: 9999px; }
    @media (prefers-color-scheme: dark) {
      .m-skeleton {
        background: linear-gradient(90deg, rgb(51 65 85 / .75), rgb(71 85 105 / .9), rgb(51 65 85 / .75));
        background-size: 200% 100%;
      }
    }
    @keyframes m-skeleton-shimmer { to { background-position: -200% 0; } }
    @media (prefers-reduced-motion: reduce) {
      .m-skeleton { animation: none; background-position: 0 0; }
    }
  `],
})
export class SkeletonComponent {
  readonly shape = input<SkeletonShape>('text');
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly label = input('');
}
