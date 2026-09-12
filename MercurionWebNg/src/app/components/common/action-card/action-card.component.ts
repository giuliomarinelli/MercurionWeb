import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';

export type ActionCardSize = 'compact' | 'standard' | 'wide' | 'full';

const SIZE_CLASSES: Record<ActionCardSize, string> = {
  compact: 'm-action-card--compact',
  standard: 'm-action-card--standard',
  wide: 'm-action-card--wide',
  full: 'm-action-card--full',
};

@Component({
  selector: 'm-action-card',
  standalone: true,
  imports: [IconButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="m-action-card"
      [class]="classes()"
      [attr.aria-labelledby]="labelledBy() || null"
      [attr.aria-busy]="busy() ? 'true' : null"
    >
      <header class="m-action-card__header">
        <div class="m-action-card__title">
          <ng-content select="[action-card-title]" />
        </div>
        <div class="m-action-card__close">
          @if (closeLabel()) {
            <m-icon-button
              size="sm"
              icon="close"
              [ariaLabel]="closeLabel() || 'Chiudi'"
              [disabled]="closeDisabled()"
              (pressed)="closed.emit($event)"
            />
          } @else {
            <ng-content select="[action-card-close]" />
          }
        </div>
      </header>

      <div class="m-action-card__body">
        <ng-content select="[action-card-body]" />
      </div>

      <ng-content select="[action-card-footer]" />
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .m-action-card {
      background: var(--m-action-card-background, var(--color-surface-elevated));
      border: 1px solid var(--m-action-card-border, var(--color-border));
      border-radius: var(--radius-surface);
      color: var(--m-action-card-color, var(--color-on-surface-main));
      display: flex;
      flex-direction: column;
      max-height: calc(100dvh - 2rem);
      min-height: 0;
      overflow: hidden;
      width: 100%;
    }

    .m-action-card--compact {
      max-width: 32rem;
    }

    .m-action-card--standard {
      max-width: 42rem;
    }

    .m-action-card--wide {
      max-width: 64rem;
    }

    .m-action-card--full {
      max-width: 80rem;
    }

    .m-action-card__header {
      align-items: center;
      background: color-mix(in srgb, var(--color-surface-elevated) 92%, transparent);
      border-bottom: 1px solid var(--color-border);
      display: flex;
      flex: 0 0 auto;
      gap: var(--space-4);
      justify-content: space-between;
      padding: var(--space-4) var(--space-6);
      position: relative;
      z-index: 1;
    }

    .m-action-card__title {
      min-width: 0;
    }

    .m-action-card__close {
      flex: 0 0 auto;
    }

    .m-action-card__body {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }

    @media (max-width: 767px) {
      .m-action-card {
        max-height: calc(100dvh - 0.5rem);
      }

      .m-action-card__header {
        padding: var(--space-3);
      }
    }

    :host-context(.dark) .m-action-card {
      --m-action-card-background: var(--color-surface-elevated);
      --m-action-card-border: var(--color-border);
    }

    :host-context(.dark) .m-action-card__header {
      background: color-mix(in srgb, var(--color-surface-elevated) 96%, transparent);
      border-bottom-color: var(--color-border);
    }
  `,
})
export class ActionCardComponent {
  readonly size = input<ActionCardSize>('standard');
  readonly labelledBy = input<string | null>(null);
  readonly busy = input(false);
  readonly closeLabel = input<string | null>(null);
  readonly closeDisabled = input(false);
  readonly closed = output<MouseEvent>();

  protected readonly classes = computed(() => SIZE_CLASSES[this.size()]);
}
