import {
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
  template: `
    <section class="toast-host" aria-live="polite" aria-relevant="additions removals">
      @for (toast of visibleMessages(); track toast.id) {
        <article
          #toastElement
          class="toast"
          [class.toast--success]="toast.variant === 'success'"
          [class.toast--error]="toast.variant === 'error'"
          [attr.data-toast-id]="toast.id"
          animate.enter="toast-enter"
          animate.leave="toast-leave"
        >
          <div class="toast__icon" aria-hidden="true">
            @if (toast.variant === 'success') {
              ✓
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
        top: 1rem;
        right: 1rem;
        z-index: 11000;
        pointer-events: none;
      }

      .toast-host {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: min(24rem, calc(100vw - 2rem));
        max-height: calc(100dvh - 2rem);
        overflow: clip;
      }

      .toast {
        pointer-events: auto;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.75rem;

        min-height: 4rem;
        padding: 0.875rem 1rem;

        border-radius: 1rem;
        border: 1px solid transparent;

        box-shadow:
          0 18px 45px rgb(15 23 42 / 0.18),
          0 4px 12px rgb(15 23 42 / 0.12);

        backdrop-filter: blur(10px);
        will-change: transform, opacity;
      }

      .toast--success {
        color: rgb(20 83 45);
        background: rgb(220 252 231 / 0.96);
        border-color: rgb(34 197 94 / 0.35);
      }

      .toast--error {
        color: rgb(127 29 29);
        background: rgb(254 226 226 / 0.96);
        border-color: rgb(239 68 68 / 0.35);
      }

      .toast__icon {
        display: grid;
        place-items: center;

        width: 1.75rem;
        height: 1.75rem;

        border-radius: 999px;
        font-weight: 800;
        line-height: 1;
      }

      .toast--success .toast__icon {
        background: rgb(34 197 94 / 0.18);
      }

      .toast--error .toast__icon {
        background: rgb(239 68 68 / 0.18);
      }

      .toast__message {
        margin: 0;
        font-size: 0.925rem;
        line-height: 1.35;
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

        border-radius: 999px;

        font-size: 1.35rem;
        line-height: 1;
        opacity: 0.7;
      }

      .toast__close:hover {
        opacity: 1;
        background: color-mix(in srgb, white 72%, currentColor);
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
