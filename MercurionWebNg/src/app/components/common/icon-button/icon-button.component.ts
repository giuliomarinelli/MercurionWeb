import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

export type IconButtonVariant = 'ghost' | 'neutral' | 'destructive' | 'outline';
export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonIcon = 'close' | 'custom';

const BASE_CLASSES =
  'inline-flex items-center justify-center rounded-md border border-transparent p-0 cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-55';

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-indigo-300',
  neutral:
    'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-50 dark:hover:bg-slate-600',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800',
  outline:
    'border-indigo-500 bg-transparent text-indigo-700 hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-indigo-950/40',
};

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
};

@Component({
  selector: 'm-icon-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [class]="classes()"
      type="button"
      [disabled]="disabled()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-labelledby]="ariaLabelledby() || null"
      [attr.aria-describedby]="ariaDescribedby() || null"
      [attr.aria-disabled]="disabled() ? 'true' : null"
      (click)="onClick($event)"
    >
      <span class="inline-flex size-5 items-center justify-center [&>svg]:size-full [&>svg]:fill-current" aria-hidden="true">
        @if (icon() === 'close') {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"/>
          </svg>
        } @else {
          <ng-content></ng-content>
        }
      </span>
    </button>
  `,
})
export class IconButtonComponent {
  readonly ariaLabel = input.required<string>();
  readonly ariaLabelledby = input<string>();
  readonly ariaDescribedby = input<string>();
  readonly icon = input<IconButtonIcon>('custom');
  readonly size = input<IconButtonSize>('md');
  readonly variant = input<IconButtonVariant>('ghost');
  readonly disabled = input(false);
  readonly pressed = output<MouseEvent>();

  protected readonly classes = computed(
    () =>
      `${BASE_CLASSES} ${VARIANT_CLASSES[this.variant()]} ${SIZE_CLASSES[this.size()]}`,
  );

  protected onClick(event: MouseEvent): void {
    if (!this.disabled()) {
      this.pressed.emit(event);
    }
  }
}
