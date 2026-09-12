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
      background: var(--m-action-card-background, white);
      border: 1px solid var(--m-action-card-border, rgb(226 232 240));
      border-radius: 1rem;
      color: var(--m-action-card-color, inherit);
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
      background: rgb(255 255 255 / 0.92);
      border-bottom: 1px solid rgb(226 232 240);
      display: flex;
      flex: 0 0 auto;
      gap: 1rem;
      justify-content: space-between;
      padding: 1rem 1.5rem;
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
        padding: 0.75rem;
      }
    }

    :host-context(.dark) .m-action-card {
      --m-action-card-background: var(--dark-surface-main, rgb(15 23 42));
      --m-action-card-border: rgb(51 65 85);
    }

    :host-context(.dark) .m-action-card__header {
      background: rgb(15 23 42 / 0.96);
      border-bottom-color: rgb(51 65 85);
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
