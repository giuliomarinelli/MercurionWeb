import { SensitiveDataChangeContextService } from './../../../services/context/action-context/sensitive-data-change-context.service';
import { Component, inject } from '@angular/core';
import { ClassicSpinnerComponent } from '../../common/classic-spinner/classic-spinner.component';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';

@Component({
  selector: 'm-sensitive-data-change',
  imports: [ClassicSpinnerComponent],
  template: `

<div class="flex justify-center items-center min-h-screen px-2">
  <div class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg">

    <!-- Header sticky fuori dallo scroll -->
    <div class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main">
      <h2 class="text-lg font-semibold">Collega molecola a nuove collezioni</h2>
      <button class="inline-flex items-center justify-center size-8 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-transparent transition" (click)="close()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"/>
        </svg>
      </button>
    </div>
    <div class="py-6 px-3 overflow-y-auto flex flex-col gap-4 min-h-[60vh] max-h-[60vh]">
      <!-- body -->
    </div>
    <div class="my-4 mr-8 flex justify-end gap-2">
      @if (true) {
        <button
          type="button"
          class="px-4 py-2 rounded bg-slate-200 text-light-on-surface-main dark:bg-slate-100 dark:text-neutral-950 hover:bg-gray-300"

        >
          Annulla
        </button>
      }
      <button
        type="submit"
        class="relative inline-flex items-center justify-center px-4 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed"
        [disabled]="false"
        [attr.aria-busy]=""
      >

        <span [class.invisible]="">
          @if (0) {
            <span>Aggiungi</span>
          } @else if (1) {
            <span>Ok</span>
          }
        </span>

        <!-- Overlay spinner without affecting layout -->
        <span
          aria-hidden="true"
          class="absolute inset-0 flex items-center justify-center"
          [class.hidden]=""
        >
          <app-classic-spinner [size]="24"></app-classic-spinner>
        </span>
      </button>
    </div>
  </div>
</div>
  `
})
export class SensitiveDataChangeComponent {

  private readonly actionContext = inject(ActionOverlayContextService)
  private readonly dataChangeContext = inject(SensitiveDataChangeContextService)





  close(): void {
    this.dataChangeContext.clearInnerScope()
    this.actionContext.close()
  }

}
