import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'neutral'
  | 'ghost'
  | 'outline';

export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';
export type ButtonIconPosition = 'leading' | 'trailing';

const VARIANT_CLASSES = {
  primary: 'm-button__control--primary',
  secondary: 'm-button__control--secondary',
  destructive: 'm-button__control--destructive',
  neutral: 'm-button__control--neutral',
  ghost: 'm-button__control--ghost',
  outline: 'm-button__control--outline',
} satisfies Record<ButtonVariant, string>;

const SIZE_CLASSES = {
  sm: 'm-button__control--sm',
  md: 'm-button__control--md',
  lg: 'm-button__control--lg',
} satisfies Record<ButtonSize, string>;

const ICON_POSITION_CLASSES = {
  leading: 'm-button__control--icon-leading',
  trailing: 'm-button__control--icon-trailing',
} satisfies Record<ButtonIconPosition, string>;

@Component({
  selector: 'm-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [class]="classes()"
      [attr.type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-current]="ariaCurrent()"
      [attr.aria-busy]="loading() ? 'true' : null"
      [attr.aria-disabled]="disabled() || loading() ? 'true' : null"
      (click)="onClick($event)"
    >
      @if (loading()) {
        <span class="m-button__spinner" aria-hidden="true"></span>
      }
      <span class="m-button__content" [class.m-button__content--loading]="loading()">
        <ng-content></ng-content>
      </span>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .m-button__control {
      align-items: center;
      border: 1px solid transparent;
      border-radius: var(--m-radius-control);
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-weight: 600;
      gap: var(--m-space-2);
      justify-content: center;
      min-height: 2.5rem;
      position: relative;
      transition: background-color 150ms ease, border-color 150ms ease,
        color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
    }

    .m-button__control:focus-visible {
      outline: 3px solid var(--m-color-focus);
      outline-offset: var(--m-space-2);
    }

    .m-button__control:active:not(:disabled) {
      transform: translateY(1px);
    }

    .m-button__control:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .m-button__control--sm {
      min-height: 2rem;
      padding: 0.375rem var(--m-space-3);
      font-size: 0.75rem;
    }

    .m-button__control--md {
      padding: 0.625rem var(--m-space-4);
      font-size: var(--m-font-body);
    }

    .m-button__control--lg {
      min-height: 3rem;
      padding: var(--m-space-3) var(--m-space-6);
      font-size: 1rem;
    }

    .m-button__control--primary {
      background: var(--m-color-control-primary);
      color: var(--m-color-on-control-filled);
    }

    .m-button__control--primary:hover:not(:disabled) {
      background: var(--m-color-control-primary-hover);
    }

    .m-button__control--secondary {
      background: var(--m-color-control-secondary);
      color: var(--m-color-on-control-filled);
    }

    .m-button__control--secondary:hover:not(:disabled) {
      background: var(--m-color-control-secondary-hover);
    }

    .m-button__control--destructive {
      background: var(--m-color-control-destructive);
      color: var(--m-color-on-control-filled);
    }

    .m-button__control--destructive:hover:not(:disabled) {
      background: var(--m-color-control-destructive-hover);
    }

    .m-button__control--neutral {
      background: var(--m-color-surface-secondary);
      color: var(--m-color-on-surface-main);
    }

    .m-button__control--neutral:hover:not(:disabled) {
      background: var(--m-color-control-neutral-hover);
    }

    .m-button__control--ghost {
      background: transparent;
      color: var(--m-color-on-surface-main);
    }

    .m-button__control--ghost:hover:not(:disabled) {
      background: var(--m-color-control-ghost-hover);
    }

    .m-button__control--outline {
      background: transparent;
      border-color: var(--m-color-focus);
      color: var(--m-color-control-outline-text);
    }

    .m-button__control--outline:hover:not(:disabled) {
      background: var(--m-color-control-outline-hover);
    }

    .m-button__spinner {
      animation: m-button-spin 700ms linear infinite;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: var(--m-radius-pill);
      height: 1em;
      left: 50%;
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 1em;
    }

    .m-button__content {
      align-items: center;
      display: inline-flex;
      gap: inherit;
    }

    .m-button__content--loading {
      visibility: hidden;
    }

    @keyframes m-button-spin {
      to {
        transform: translate(-50%, -50%) rotate(360deg);
      }
    }
  `,
})
export class ButtonComponent {

  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<ButtonType>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly ariaLabel = input<string | null>(null);
  readonly ariaCurrent = input<string | null>(null);
  readonly iconPosition = input<ButtonIconPosition>('leading');
  readonly pressed = output<MouseEvent>();

  protected readonly classes = computed(
    () =>
      [
        'm-button__control',
        VARIANT_CLASSES[this.variant()],
        SIZE_CLASSES[this.size()],
        ICON_POSITION_CLASSES[this.iconPosition()],
      ].join(' '),
  );

  protected onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.pressed.emit(event);
    }
  }
}
