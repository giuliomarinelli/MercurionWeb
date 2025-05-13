// toast.component.ts
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ToastService } from '../../../services/toast.service';

export type ToastContext = 'error' | 'warn' | 'success'

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, NgClass],
  template: `
    @if (toast.show()) {
      <div
        class="fixed top-8 right-4 z-50 max-w-sm w-full px-4 py-6 text-lg rounded-md text-white shadow-lg transition-all duration-700 transform"
        [ngClass]="className"
        [class.translate-x-full]="!toast.slideIn()"
        [class.translate-x-0]="toast.slideIn()"
        role="alert"
      >
        <div class="flex justify-between items-center gap-4">
          <p class="text-sm font-medium">{{ toast.message() }}</p>
          <button (click)="toast.close()" class="text-white hover:text-red-200">✕</button>
        </div>
      </div>
    }
  `
})
export class ToastComponent implements OnChanges {

  @Input()
  public context: ToastContext = 'error'
  protected className: string = ''

  constructor(protected readonly toast: ToastService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['context']) {
      switch (this.context) {
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
    }
  }

}
