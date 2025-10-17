import { Component, Input, signal } from '@angular/core';
import { AdministrationRoutes } from '../../../Models/graphql/molecule.detail.models';


@Component({
  selector: 'molecule-routes',
  standalone: true,
  template: `
    <section class="my-4">
      <h2 class="font-semibold text-light-accent-primary dark:text-dark-accent-primary mb-6 text-center sm:text-left text-xl">Vie di somministrazione</h2>
      <div class="flex flex-wrap gap-2 text-sm justify-center sm:justify-start">
        @if (adminRoutes().oral) {
          <div class="flex items-center rounded bg-slate-200 dark:bg-gray-800 text-blue-900 dark:text-blue-100 px-2 py-1 gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" class="w-auto h-5">
              <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path class="fill-current text-light-accent-primary dark:text-dark-accent-primary"
                d="M64 144c0-26.5 21.5-48 48-48s48 21.5 48 48l0 112-96 0 0-112zM0 144L0 368c0 61.9 50.1 112 112 112s112-50.1 112-112l0-178.4c1.8 19.1 8.2 38 19.8 54.8L372.3 431.7c35.5 51.7 105.3 64.3 156 28.1s63-107.5 27.5-159.2L427.3 113.3C391.8 61.5 321.9 49 271.3 85.2c-28 20-44.3 50.8-47.3 83l0-24.2c0-61.9-50.1-112-112-112S0 82.1 0 144zm296.6 64.2c-16-23.3-10-55.3 11.9-71c21.2-15.1 50.5-10.3 66 12.2l67 97.6L361.6 303l-65-94.8zM491 407.7c-.8 .6-1.6 1.1-2.4 1.6l4-2.8c-.5 .4-1 .8-1.6 1.2z"/>
          </svg>
            <span>Orale</span>
          </div>
        }
        @if (adminRoutes().parenteral) {
          <div class="flex items-center rounded bg-slate-200 dark:bg-gray-800 text-blue-900 dark:text-blue-100 px-2 py-1 gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-auto h-5">
              <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path class="fill-current text-light-accent-primary dark:text-dark-accent-primary"
                d="M452.2 18.2L473 39l20.8 20.8 17 17-33.9 33.9-17-17L456 89.9 417.9 128l55 55 17 17L456 233.9l-17-17-72-72L295 73l-17-17L312 22.1l17 17 55 55L422.1 56l-3.8-3.8-17-17L435.2 1.3l17 17zM210.3 155.7l61.1-61.1c.3 .3 .6 .7 1 1l16 16 56 56 56 56 16 16c.3 .3 .7 .6 1 1L217 441l-7 7-9.9 0L97.9 448 52.2 493.8l-17 17L1.3 476.8l17-17L64 414.1 64 312l0-9.9 7-7 52.7-52.7 57 57L192 310.6 214.6 288l-11.3-11.3-57-57 41.4-41.4 57 57L256 246.6 278.6 224l-11.3-11.3-57-57z"/>
            </svg>
            <span>Parenterale</span>
          </div>
        }
        @if (adminRoutes().topical) {
          <span class="flex items-center rounded bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 px-2 py-1">
            🧴 Topica
          </span>
        }
      </div>
    </section>
  `,
})
export class MoleculeRoutesComponent {
  private readonly routeSignal = signal<AdministrationRoutes>({
    oral: false,
    parenteral: false,
    topical: false
  })

  @Input()
  set adminRoutesInput(value: AdministrationRoutes) {
    this.routeSignal.set(value);
  }

  readonly adminRoutes = this.routeSignal.asReadonly()
}
