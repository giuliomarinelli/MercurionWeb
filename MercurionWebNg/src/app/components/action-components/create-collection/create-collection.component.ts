import { Component, inject } from '@angular/core';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';

@Component({
  selector: 'app-create-collection',
  imports: [],
  template: `

  <div class="flex justify-center items-center min-h-screen px-2">
    <div class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg">
      <div class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main">
        <h2 class="text-lg font-semibold">Crea una o più collezioni molecolari</h2>
        <button class="text-2xl hover:text-emerald-600" (click)="close()">&times;</button>
      </div>
      <!-- <div class="mx-auto">
        <div class="mt-6 space-y-6 sm:flex sm:items-center sm:space-x-10 sm:space-y-0 px-6 pb-6 border-b border-spacing-y-[0.3px]">
        </div>
      </div> -->
      <div class="border-b min-h-24 relative">
        <div class="absolute inset-0 flex justify-center items-center text-sm text-gray-500 dark:text-gray-400">
          Qui vedrai l'anteprima delle nuove collezioni.
        </div>
      </div>
      <div class="py-6 px-3 overflow-y-auto flex flex-col gap-4 min-h-[60vh] max-h-[60vh]">
                    <!-- qui sta il nostro contenuto -->
      </div>
    </div>

  </div>

  `
})
export class CreateCollectionComponent {

  private readonly overlayContext = inject(ActionOverlayContextService)


  close(): void {
    this.overlayContext.close()
  }


}
