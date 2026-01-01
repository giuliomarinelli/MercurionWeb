// toast.component.ts
import { ChangeDetectionStrategy, Component, effect, Input, OnChanges, OnInit, signal, SimpleChanges } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ToastService } from '../../../services/toast.service';

export type ToastContext = 'error' | 'warn' | 'success'

@Component({
  selector: 'm-toast',
  imports: [CommonModule, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast.show()) {
      <div
        class="fixed top-8 right-4 z-50 max-w-[250px] 2xs:max-w-[320px] sm:max-w-sm xs:w-full mx-4 px-4 py-6 text-lg rounded-md text-white shadow-lg transition-all duration-700 transform"
        [ngClass]="className"
        [class.translate-x-full]="!toast.slideIn()"
        [class.translate-x-0]="toast.slideIn()"
        role="alert"
        aria-live="assertive"
      >
        <div class="flex justify-between items-center gap-4">
          <p class="text-sm font-medium">{{ toast.message() }}</p>
          <button (click)="toast.close()" class="text-white hover:text-red-200">✕</button>
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
  protected className: string = ''

  constructor(protected readonly toast: ToastService) {
    effect(() => {
      switch (this._context()) {
        case 'error':
          this.className = 'bg-red-600'
          break
        case 'success':
          this.className = 'bg-light-accent-primary dark:bg-light-accent-primary'
          break
        case 'warn':
          this.className = 'bg-amber-200'
          break
      }
    })
  }

}
