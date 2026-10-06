import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { SmoothResizeDirective } from '../smooth-resize/smooth-resize.directive';

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
  imports: [IconButtonComponent, SmoothResizeDirective],
  host: { '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="m-action-card"
      mSmoothResize="both"
      resizeKey="action-card"
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

      <div class="m-action-card__body" [class.m-action-card__body--managed]="!bodyScroll()">
        <ng-content select="[action-card-body]" />
      </div>

      <ng-content select="[action-card-footer]" />
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      width: 100%;
    }

    .m-action-card {
      background: var(--m-action-card-background, var(--m-color-surface-elevated));
      border: 1px solid var(--m-action-card-border, var(--m-color-border));
      border-radius: var(--m-radius-surface);
      color: var(--m-action-card-color, var(--m-color-on-surface-main));
      display: flex;
      flex-direction: column;
      height: var(--m-action-card-height, auto);
      max-height: var(--m-action-card-available-height, calc(var(--m-overlay-vh, 1dvh) * 100 - 2rem));
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      width: 100%;
    }

    :host(.m-action-card--compact) {
      max-width: 32rem;
    }

    :host(.m-action-card--standard) {
      max-width: 42rem;
    }

    :host(.m-action-card--wide) {
      max-width: 64rem;
    }

    :host(.m-action-card--full) {
      max-width: 80rem;
    }

    .m-action-card__header {
      align-items: center;
      background: color-mix(in srgb, var(--m-color-surface-elevated) 92%, transparent);
      border-bottom: 1px solid var(--m-color-border);
      display: flex;
      flex: 0 0 auto;
      gap: var(--m-space-4);
      justify-content: space-between;
      padding: var(--m-space-4) var(--m-space-6);
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
      min-height: 4rem;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .m-action-card__body--managed {
      min-height: 0;
      overflow: hidden;
    }

    @media (max-width: 767px) {
      .m-action-card__header {
        padding: var(--m-space-3);
        position: sticky;
        top: 0;
        background: var(--m-color-surface-elevated);
      }

      .m-action-card__body {
        flex: 0 0 auto;
        min-height: 0;
        overflow: visible;
      }
    }

    :host-context(.m-dialog--compact) .m-action-card__header {
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      min-height: 4.5rem;
      height: var(--m-action-card-header-height, auto);
      position: sticky;
      top: 0;
      background: var(--m-color-surface-elevated);
    }

    :host-context(.m-dialog--compact) .m-action-card__body {
      flex: 0 0 auto;
      min-height: 0;
      overflow: visible;
    }

    :host-context(.m-dialog--short) .m-action-card__header {
      position: sticky;
      top: 0;
      background: var(--m-color-surface-elevated);
    }

    :host-context(.dark) .m-action-card {
      --m-action-card-background: var(--m-color-surface-elevated);
      --m-action-card-border: var(--m-color-border);
    }

    :host-context(.dark) .m-action-card__header {
      background: color-mix(in srgb, var(--m-color-surface-elevated) 96%, transparent);
      border-bottom-color: var(--m-color-border);
    }

  `,
})
export class ActionCardComponent {
  readonly size = input<ActionCardSize>('standard');
  readonly labelledBy = input<string | null>(null);
  readonly busy = input(false);
  readonly bodyScroll = input(true);
  readonly closeLabel = input<string | null>(null);
  readonly closeDisabled = input(false);
  readonly closed = output<MouseEvent>();

  protected readonly classes = computed(() => SIZE_CLASSES[this.size()]);
}
