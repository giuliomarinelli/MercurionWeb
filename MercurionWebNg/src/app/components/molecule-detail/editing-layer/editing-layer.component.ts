import { Component, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-editing-layer',
  imports: [RouterLink],
  template: `
    <div class="flex flex-col lg:flex-row gap-2 lg:gap-4 my-6">
      <a
        [routerLink]="pathToEditor()"
        [queryParams]="queryParamsToDuplicate()"
        class="flex justify-center mx-auto sm:mx-0 text-xs w-fit 2xs:text-base xs:w-[370px] gap-2 items-center px-4 mt-4 py-2 text-white rounded-md transition-colors duration-150
         bg-light-accent-primary dark:bg-dark-accent-primary-btn
         hover:bg-dark-accent-primary/90 dark:hover:bg-dark-accent-primary/90
         disabled:bg-dark-accent-primary/65 disabled:dark:bg-dark-accent-primary/65
         disabled:cursor-not-allowed disabled:hover:bg-dark-accent-primary/80 disabled:hover:dark:bg-dark-accent-primary/80"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-6 h-6">
          <!--!Font Awesome Pro v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M122.9 379.1C112.2 389.8 104.4 403.2 100.3 417.8L64.9 545.6C62.6 553.9 64.9 562.9 71.1 569C77.3 575.1 86.2 577.5 94.5 575.2L222.3 539.7C236.9 535.6 250.2 527.9 261 517.1L555 223.1C568.4 209.6 576 191.2 576 172C576 152.8 568.4 134.4 554.8 120.9L519.1 85.2C505.6 71.6 487.2 64 468 64C448.8 64 430.4 71.6 416.9 85.2L122.9 379.2zM468 112C474.4 112 480.6 114.6 485.2 119.1L520.9 154.8C525.5 159.4 528 165.5 528 172C528 178.5 525.4 184.6 520.9 189.2L468 242.1L397.9 172L450.8 119.1C455.4 114.5 461.5 112 468 112zM173.9 396L364 205.9L434.1 276L244 466.1L173.9 396zM145.3 435.3L204.7 494.7L122.5 517.5L145.3 435.3z"/>
        </svg>
        <span class="text-slate-100">Crea molecola da questa struttura</span>
      </a>
      <a
        [routerLink]="pathToEditor()"
        [queryParams]="queryParamsToDuplicate()"
        class="flex justify-center mx-auto sm:mx-0 text-sm w-fit 2xs:text-base xs:w-[370px] gap-2 items-center px-4 mt-4 py-2 text-white rounded-md transition-colors duration-150
         bg-emerald-600
         hover:bg-emerald-400/90 dark:hover:bg-emerald-600/90"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-6 h-6">
          <!--!Font Awesome Pro v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM296 408C296 421.3 306.7 432 320 432C333.3 432 344 421.3 344 408L344 344L408 344C421.3 344 432 333.3 432 320C432 306.7 421.3 296 408 296L344 296L344 232C344 218.7 333.3 208 320 208C306.7 208 296 218.7 296 232L296 296L232 296C218.7 296 208 306.7 208 320C208 333.3 218.7 344 232 344L296 344L296 408z"/>
        </svg>
        <span class="text-slate-100">Aggiungi ad una collezione</span>
      </a>
    </div>


  `
})
export class EditingLayerComponent {

  queryParamsToDuplicate = signal<Record<string, string>>({})
  pathToEditor = signal<string>('')

  @Input()
  set smiles(smiles: string | undefined) {
    if (smiles) {
      this.pathToEditor.set('/molecules/editor')
      this.queryParamsToDuplicate.set({
        mode: 'duplicate',
        smiles
      })
    }
  }

}
