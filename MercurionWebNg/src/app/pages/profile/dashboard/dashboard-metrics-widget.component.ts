import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DashboardMetricsViewModel } from './dashboard-widget.models';

@Component({
  selector: 'm-dashboard-metrics-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center mb-12">
      <div
        class="rounded-full w-20 h-20 text-xl font-semibold flex items-center justify-center
               bg-light-accent-secondary dark:bg-dark-accent-primary-btn text-white shadow-md mb-4"
        role="img"
        [attr.aria-label]="'Profilo di ' + metrics().firstName + ' ' + metrics().lastName">
        {{ metrics().initials }}
      </div>
      <h1 id="dashboard-heading" class="text-3xl sm:text-4xl lg:text-5xl text-center tracking-wide">
        Benvenut{{ metrics().ending }} {{ metrics().firstName }}.
      </h1>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      @for (metric of metricCards(); track metric.label) {
        <div class="rounded-lg border border-slate-300/70 dark:border-slate-700/70
                    bg-blue-50 dark:bg-[#050816] px-4 py-4 shadow-sm"
             role="group" [attr.aria-label]="metric.label">
          <p class="text-sm text-neutral-950 dark:text-slate-200 font-semibold">{{ metric.label }}</p>
          <p class="text-3xl font-semibold mt-1">{{ metric.value }}</p>
        </div>
      }
    </div>
  `
})
export class DashboardMetricsWidgetComponent {
  readonly metrics = input.required<DashboardMetricsViewModel>();

  protected metricCards() {
    const value = this.metrics();
    return [
      { label: 'Totale molecole', value: value.totalMolecules },
      { label: 'Molecole personali', value: value.personalMolecules },
      { label: 'Molecole ChEMBL', value: value.chemblMolecules },
      { label: 'Collezioni', value: value.collections }
    ];
  }
}
