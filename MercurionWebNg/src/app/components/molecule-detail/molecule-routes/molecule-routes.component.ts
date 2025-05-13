import { Component, Input, signal } from '@angular/core';
import { AdministrationRoutes } from '../../../Models/graphql/molecule.detail';


@Component({
  selector: 'molecule-routes',
  standalone: true,
  template: `
    <section class="mt-4 mb-8">
      <h2 class="font-semibold text-light-accent-primary dark:text-dark-accent-primary text-center xs:text-left text-lg mb-6">Vie di somministrazione</h2>
      <div class="flex flex-wrap gap-2 text-sm justify-center xs:justify-start">
        @if (adminRoutes().oral) {
          <div class="flex items-center rounded bg-slate-200 dark:bg-gray-800 text-blue-900 dark:text-blue-100 px-2 py-1 gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" class="w-auto h-5">
              <!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path class="fill-current text-light-accent-secondary/75 dark:text-dark-accent-secondary/75" d="M0 144l0 80 0 32 32 0 160 0 32 0 0-32 0-80c0-61.9-50.1-112-112-112S0 82.1 0 144zM256 320c0 88.4 71.6 160 160 160c38.4 0 73.7-13.5 101.3-36.1L292.1 218.7C269.5 246.3 256 281.6 256 320zm58.7-123.9L539.9 421.3C562.5 393.7 576 358.4 576 320c0-88.4-71.6-160-160-160c-38.4 0-73.7 13.5-101.3 36.1z"/>
              <path class="fill-current text-light-accent-primary dark:text-dark-accent-primary" d="M32 256L0 256l0 32 0 80c0 61.9 50.1 112 112 112s112-50.1 112-112l0-80 0-32-32 0L32 256z"/>
            </svg>
            <span>Orale</span>
          </div>
        }
        @if (adminRoutes().parenteral) {
          <div class="flex items-center rounded bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 px-2 py-1">
            💉 Parenterale
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
  });

  @Input()
  set adminRoutesInput(value: AdministrationRoutes) {
    this.routeSignal.set(value);
  }

  readonly adminRoutes = this.routeSignal.asReadonly()
}
