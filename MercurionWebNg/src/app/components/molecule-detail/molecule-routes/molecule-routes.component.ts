import { Component, Input, signal } from '@angular/core';
import { AdministrationRoutes } from '../../../Models/graphql/molecule.detail';


@Component({
  selector: 'molecule-routes',
  standalone: true,
  template: `
    <section class="mt-4">
      <h2 class="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Vie di somministrazione</h2>
      <div class="flex flex-wrap gap-2 text-sm">
        @if (adminRoutes().oral) {
          <span class="inline-flex items-center rounded bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 px-2 py-1">
            💊 Orale
          </span>
        }
        @if (adminRoutes().parenteral) {
          <span class="inline-flex items-center rounded bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 px-2 py-1">
            💉 Parenterale
          </span>
        }
        @if (adminRoutes().topical) {
          <span class="inline-flex items-center rounded bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 px-2 py-1">
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
