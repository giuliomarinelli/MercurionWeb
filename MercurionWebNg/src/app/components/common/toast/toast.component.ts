import { ChangeDetectionStrategy, Component, computed, Input, signal } from '@angular/core'
import { CommonModule, NgClass } from '@angular/common'
import { ToastContext } from '../../../Models/toast.models'
import { ToastService } from '../../../services/toast.service'

@Component({
  selector: 'm-toast',
  imports: [CommonModule, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast.show()) {
      <div
        class="fixed top-8 right-4 z-50 max-w-[250px] 2xs:max-w-[320px] sm:max-w-sm xs:w-full mx-4 px-4 py-5 rounded-lg shadow-2xl transition-transform duration-700 transform text-[0.95rem] leading-snug ring-1 ring-black/10 dark:ring-white/10"
        [ngClass]="contextClass()"
        [class.translate-x-full]="!toast.slideIn()"
        [class.translate-x-0]="toast.slideIn()"
        role="alert"
        aria-live="assertive"
      >
        <div class="flex justify-between items-center gap-4 text-inherit">
          <p class="text-sm font-medium text-inherit">{{ toast.message() }}</p>
          <button
            type="button"
            (click)="toast.close()"
            class="p-1 rounded-md text-inherit hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-white/80 dark:focus-visible:ring-black/70 focus-visible:ring-offset-transparent transition"
            aria-label="Chiudi notifica"
          >
            ✕
          </button>
        </div>
      </div>
    }
  `
})
export class ToastComponent {

  private _context = signal<ToastContext>('error')

  @Input()
  public set context(context: ToastContext) {
    this._context.set(context)
  }

  private readonly contextClassMap: Record<ToastContext, string> = {
    error: 'bg-[#7f1d1d] text-white dark:bg-[#fee2e2] dark:text-[#3b0d0c]',
    success: 'bg-[#065f46] text-white dark:bg-[#d1fae5] dark:text-[#064e3b]',
    warn: 'bg-[#78350f] text-white dark:bg-[#fef3c7] dark:text-[#2a1502]'
  }

  protected readonly contextClass = computed(() => this.contextClassMap[this._context()])

  constructor(protected readonly toast: ToastService) {}
}
