// toast.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';


@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (toast.show()) {
      <div
        class="fixed top-8 right-4 z-50 max-w-sm w-full px-4 py-6 text-lg rounded-md bg-red-600 text-white shadow-lg transition-all duration-700 transform"
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
export class ToastComponent {
  constructor(protected readonly toast: ToastService) { }
}
