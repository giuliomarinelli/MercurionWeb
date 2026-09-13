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
      border-radius: 0.5rem;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-weight: 600;
      gap: 0.5rem;
      justify-content: center;
      min-height: 2.5rem;
      position: relative;
      transition: background-color 150ms ease, border-color 150ms ease,
        color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
    }

    .m-button__control:focus-visible {
      outline: 3px solid rgb(99 102 241 / 0.45);
      outline-offset: 2px;
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
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    .m-button__control--md {
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
    }

    .m-button__control--lg {
      min-height: 3rem;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
    }

    .m-button__control--primary {
      background: #4f46e5;
      color: white;
    }

    .m-button__control--primary:hover:not(:disabled) {
      background: #4338ca;
    }

    .m-button__control--secondary {
      background: #0f766e;
      color: white;
    }

    .m-button__control--secondary:hover:not(:disabled) {
      background: #115e59;
    }

    .m-button__control--destructive {
      background: #dc2626;
      color: white;
    }

    .m-button__control--destructive:hover:not(:disabled) {
      background: #b91c1c;
    }

    .m-button__control--neutral {
      background: #e2e8f0;
      color: #1e293b;
    }

    .m-button__control--neutral:hover:not(:disabled) {
      background: #cbd5e1;
    }

    .m-button__control--ghost {
      background: transparent;
      color: #334155;
    }

    .m-button__control--ghost:hover:not(:disabled) {
      background: rgb(148 163 184 / 0.18);
    }

    .m-button__control--outline {
      background: transparent;
      border-color: #6366f1;
      color: #4338ca;
    }

    .m-button__control--outline:hover:not(:disabled) {
      background: #eef2ff;
    }

    :host-context(.dark) .m-button__control--neutral {
      background: #334155;
      color: #f8fafc;
    }

    :host-context(.dark) .m-button__control--ghost {
      color: #e2e8f0;
    }

    :host-context(.dark) .m-button__control--outline {
      color: #c7d2fe;
    }

    .m-button__spinner {
      animation: m-button-spin 700ms linear infinite;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 9999px;
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
      `m-button__control m-button__control--${this.variant()} m-button__control--${this.size()} m-button__control--icon-${this.iconPosition()}`,
  );

  protected onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.pressed.emit(event);
    }
  }
}
