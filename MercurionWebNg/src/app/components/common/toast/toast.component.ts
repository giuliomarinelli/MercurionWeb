import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChildren,
} from '@angular/core'
import { DOCUMENT } from '@angular/common'
import { ToastService } from '../../../services/toast.service'

@Component({
  selector: 'm-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="toast-host" aria-live="polite" aria-relevant="additions removals">
      @for (toast of visibleMessages(); track toast.id) {
        <article
          #toastElement
          class="toast"
          [class.toast--success]="toast.variant === 'success'"
          [class.toast--warn]="toast.variant === 'warn'"
          [class.toast--error]="toast.variant === 'error'"
          [attr.data-toast-id]="toast.id"
          animate.enter="toast-enter"
          animate.leave="toast-leave"
        >
          <div class="toast__icon" aria-hidden="true">
            @if (toast.variant === 'success') {
              ✓
            } @else if (toast.variant === 'warn') {
              !
            } @else {
              !
            }
          </div>

          <p class="toast__message">
            {{ toast.message }}
          </p>

          <button
            type="button"
            class="toast__close"
            aria-label="Chiudi notifica"
            (click)="close(toast.id)"
          >
            ×
          </button>
        </article>
      }
    </section>
  `,
  styles: [
    `
      :host {
        position: fixed;
        top: var(--space-4);
        right: var(--space-4);
        z-index: 11000;
        pointer-events: none;
      }

      .toast-host {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        width: min(24rem, calc(100vw - 2 * var(--space-4)));
        max-height: calc(100dvh - 2 * var(--space-4));
        overflow: clip;
      }

      .toast {
        pointer-events: auto;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: var(--space-3);

        min-height: theme('spacing.16');
        padding: 0.875rem theme('spacing.token-4');

        border-radius: var(--radius-surface);
        border: 1px solid transparent;

        box-shadow:
          var(--shadow-surface);

        backdrop-filter: blur(10px);
        will-change: transform, opacity;
      }

      .toast--success {
        color: var(--color-status-success);
        background: color-mix(in srgb, var(--color-status-success) 18%, var(--color-surface-elevated));
        border-color: color-mix(in srgb, var(--color-status-success) 35%, transparent);
      }

      .toast--error {
        color: var(--color-status-error);
        background: color-mix(in srgb, var(--color-status-error) 18%, var(--color-surface-elevated));
        border-color: color-mix(in srgb, var(--color-status-error) 35%, transparent);
      }

      .toast--warn {
        color: var(--color-status-warning);
        background: color-mix(in srgb, var(--color-status-warning) 18%, var(--color-surface-elevated));
        border-color: color-mix(in srgb, var(--color-status-warning) 40%, transparent);
      }

      .toast__icon {
        display: grid;
        place-items: center;

        width: 1.75rem;
        height: 1.75rem;

        border-radius: var(--radius-pill);
        font-weight: 800;
        line-height: 1;
      }

      .toast--success .toast__icon {
        background: color-mix(in srgb, var(--color-status-success) 18%, transparent);
      }

      .toast--error .toast__icon {
        background: color-mix(in srgb, var(--color-status-error) 18%, transparent);
      }

      .toast--warn .toast__icon {
        background: color-mix(in srgb, var(--color-status-warning) 20%, transparent);
      }

      .toast__message {
        margin: 0;
        font-size: var(--font-body-sm);
        font-weight: 600;
      }

      .toast__close {
        appearance: none;
        border: 0;
        background: transparent;
        color: currentColor;
        cursor: pointer;

        width: 1.75rem;
        height: 1.75rem;

        border-radius: var(--radius-pill);

        font-size: 1.35rem;
        line-height: 1;
        opacity: 0.7;
      }

      .toast__close:hover {
        opacity: 1;
        background: color-mix(in srgb, var(--color-surface-elevated) 72%, currentColor);
        color: currentColor;
      }

      .toast-enter {
        animation: toast-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .toast-leave {
        animation: toast-leave 140ms ease-in both;
      }

      @keyframes toast-enter {
        from {
          opacity: 0;
          transform: translateY(-0.75rem) scale(0.98);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes toast-leave {
        from {
          opacity: 1;
          transform: translateX(0) scale(1);
        }

        to {
          opacity: 0;
          transform: translateX(0.75rem) scale(0.98);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .toast-enter,
        .toast-leave {
          animation: none;
        }
      }
    `,
  ],
})
export class ToastComponent {
  private readonly toastService = inject(ToastService)
  private readonly document = inject(DOCUMENT)

  private readonly viewportHeight = signal(0)

  private readonly toastElements = viewChildren<ElementRef<HTMLElement>>('toastElement')

  private previousRects = new Map<string, DOMRect>()

  readonly messages = this.toastService.messages

  readonly maxVisibleMessages = computed(() => {
    const availableHeight = this.viewportHeight() - 32

    /**
     * Stima prudente:
     * 64px altezza minima toast
     * 12px gap
     * qualche margine extra per messaggi su due righe
     */
    const estimatedToastSlot = 92

    return Math.max(1, Math.floor(availableHeight / estimatedToastSlot))
  })

  readonly visibleMessages = computed(() => this.messages().slice(0, this.maxVisibleMessages()))

  constructor() {
    afterNextRender({
      write: () => {
        const win = this.document.defaultView

        if (!win) {
          return
        }

        const syncViewportHeight = (): void => {
          this.viewportHeight.set(win.innerHeight)
        }

        syncViewportHeight()

        win.addEventListener('resize', syncViewportHeight, {
          passive: true,
        })
      },
    })

    /**
     * FLIP minimale:
     * quando un nuovo toast entra in alto, quelli già presenti cambiano posizione.
     * Il browser di suo li sposterebbe di colpo.
     * Qui leggiamo la posizione precedente e animiamo lo spostamento verticale.
     *
     * afterRenderEffect è adatto ai casi in cui dobbiamo leggere/scrivere DOM
     * dopo il render Angular.
     */
    afterRenderEffect(() => {
      const elements = this.toastElements()
      const nextRects = new Map<string, DOMRect>()

      for (const elementRef of elements) {
        const element = elementRef.nativeElement
        const id = element.dataset['toastId']

        if (!id) {
          continue
        }

        const nextRect = element.getBoundingClientRect()
        const previousRect = this.previousRects.get(id)

        nextRects.set(id, nextRect)

        if (!previousRect) {
          continue
        }

        const deltaY = previousRect.top - nextRect.top

        if (Math.abs(deltaY) < 1) {
          continue
        }

        element.animate(
          [
            {
              transform: `translateY(${deltaY}px)`,
            },
            {
              transform: 'translateY(0)',
            },
          ],
          {
            duration: 220,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          },
        )
      }

      this.previousRects = nextRects
    })
  }

  close(id: string): void {
    this.toastService.close(id)
  }
}
