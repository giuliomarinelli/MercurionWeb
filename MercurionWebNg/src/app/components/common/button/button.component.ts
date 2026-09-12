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

@Component({
  selector: 'm-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [class]="classes()"
      [attr.type]="type()"
      [disabled]="disabled() || loading()"
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
      border-radius: var(--radius-control);
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-weight: 600;
      gap: var(--space-2);
      justify-content: center;
      min-height: 2.5rem;
      position: relative;
      transition: background-color 150ms ease, border-color 150ms ease,
        color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
    }

    .m-button__control:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--color-focus) 45%, transparent);
      outline-offset: var(--space-2);
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
      padding: 0.375rem var(--space-3);
      font-size: 0.75rem;
    }

    .m-button__control--md {
      padding: 0.625rem var(--space-4);
      font-size: var(--font-body);
    }

    .m-button__control--lg {
      min-height: 3rem;
      padding: var(--space-3) var(--space-6);
      font-size: 1rem;
    }

    .m-button__control--primary {
      background: var(--color-control-primary);
      color: var(--color-on-surface-main);
    }

    .m-button__control--primary:hover:not(:disabled) {
      background: var(--color-control-primary-hover);
    }

    .m-button__control--secondary {
      background: var(--color-control-secondary);
      color: var(--color-on-surface-main);
    }

    .m-button__control--secondary:hover:not(:disabled) {
      background: var(--color-control-secondary-hover);
    }

    .m-button__control--destructive {
      background: var(--color-control-destructive);
      color: var(--color-on-surface-main);
    }

    .m-button__control--destructive:hover:not(:disabled) {
      background: var(--color-control-destructive-hover);
    }

    .m-button__control--neutral {
      background: var(--color-surface-secondary);
      color: var(--color-on-surface-main);
    }

    .m-button__control--neutral:hover:not(:disabled) {
      background: var(--color-border);
    }

    .m-button__control--ghost {
      background: transparent;
      color: var(--color-on-surface-secondary);
    }

    .m-button__control--ghost:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-on-surface-muted) 18%, transparent);
    }

    .m-button__control--outline {
      background: transparent;
      border-color: var(--color-focus);
      color: var(--color-accent-primary-hover);
    }

    .m-button__control--outline:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-focus) 12%, var(--color-surface-main));
    }

    :host-context(.dark) .m-button__control--neutral {
      background: var(--color-surface-secondary);
      color: var(--color-on-surface-main);
    }

    :host-context(.dark) .m-button__control--ghost {
      color: var(--color-on-surface-secondary);
    }

    :host-context(.dark) .m-button__control--outline {
      color: var(--color-focus);
    }

    .m-button__spinner {
      animation: m-button-spin 700ms linear infinite;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: var(--radius-pill);
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
  readonly iconPosition = input<ButtonIconPosition>('leading');
  readonly pressed = output<MouseEvent>();

  protected readonly classes = computed(
    () =>
      `m-button__control m-button__control--${this.variant()} m-button__control--${this.size()} m-button__control--icon-${this.iconPosition()}`,
  );

  protected onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.pressed.emit(event);
    }
  }
}
