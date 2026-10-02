import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  input,
  output
} from '@angular/core'

@Component({
  selector: 'm-notification-catch-up',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="absolute right-0 top-full z-60 mt-2 w-max max-w-72 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-slate-700 dark:bg-neutral-900"
      role="status"
      aria-live="polite"
    >
      <p class="m-0 font-semibold text-slate-800 dark:text-slate-100">
        {{ count() === 1 ? 'Hai una nuova notifica' : 'Hai ' + count() + ' nuove notifiche' }}
      </p>
      <div class="mt-2 flex items-center gap-3">
        <button
          type="button"
          class="text-xs font-semibold text-light-accent-primary-hc underline underline-offset-2 dark:text-dark-accent-primary"
          (click)="opened.emit()"
        >
          Visualizza
        </button>
        <button
          type="button"
          class="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          (click)="dismissed.emit()"
        >
          Chiudi
        </button>
      </div>
    </aside>
  `
})
export class NotificationCatchUpComponent {
  readonly count = input.required<number>()
  readonly opened = output<void>()
  readonly dismissed = output<void>()
  readonly presented = output<void>()

  constructor() {
    afterNextRender(() => this.presented.emit())
  }
}
