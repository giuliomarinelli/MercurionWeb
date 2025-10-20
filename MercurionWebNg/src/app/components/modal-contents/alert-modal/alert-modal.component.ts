import { Component, computed } from '@angular/core';
import { ModalStatus } from '../../../modal.tokens';
import { AbstractModalContent } from '../abstract-modal-content/abstract-modal-content.component';



export interface AlertData {
  status?: ModalStatus;   // 'error'|'warning'|'success'|'info'|'none'
  title: string;
  message: string;
  okLabel?: string;
  cancelLabel?: string;   // se presente → mostra Annulla
}

export type AlertResult = boolean;

@Component({
  standalone: true,
  selector: 'app-alert-modal',
  template: `
  <div class="p-6">
    <div class="flex items-start gap-4">
      <!-- Icona a sinistra -->
      <div class="mt-1">
        @switch (status()) {
          @case ('error') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6">
              <path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 5h2v7h-2zm0 9h2v2h-2z"/>
            </svg>
          }
          @case ('warning') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6">
              <path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2V9h2v5z"/>
            </svg>
          }
          @case ('success') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6">
              <path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 15l-5-5 1.41-1.41L11 14.17l6.59-6.58L19 9l-8 8z"/>
            </svg>
          }
          @case ('info') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6">
              <path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
          }
          @default {
            <div class="w-6 h-6"></div>
          }
        }
      </div>

      <!-- Testo -->
      <div class="flex-1 space-y-1">
        <h2 class="text-lg font-semibold">{{ data.title }}</h2>
        <p class="text-sm text-gray-600">{{ data.message }}</p>
      </div>
    </div>

    <!-- Bottoni -->
    <div class="flex gap-3 justify-end pt-6">
      @if (hasCancel()) {
        <button class="px-3 py-2 rounded bg-gray-100" (click)="close(false)">
          {{ data.cancelLabel || 'Annulla' }}
        </button>
      }
      <button class="px-3 py-2 rounded text-white"
              [class.bg-red-600]="status() === 'error'"
              [class.bg-amber-500]="status() === 'warning'"
              [class.bg-green-600]="status() === 'success'"
              [class.bg-blue-600]="status() === 'info'"
              [class.bg-slate-800]="status() === 'none'"
              (click)="close(true)">
        {{ data.okLabel || 'OK' }}
      </button>
    </div>
  </div>
  `
})
export class AlertModalComponent
  extends AbstractModalContent<AlertData, AlertResult> {

  status = computed<ModalStatus>(() => this.data?.status ?? 'none');
  hasCancel() { return !!this.data?.cancelLabel; }
}
