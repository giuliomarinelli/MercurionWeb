import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { DashboardMetricsViewModel } from './dashboard-widget.models'

const numberFormat = new Intl.NumberFormat('it-IT')

@Component({
  selector: 'm-dashboard-metrics-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <header
      data-dashboard-heading
      class="flex min-h-32 min-w-0 lg:min-h-24 items-center gap-4 sm:gap-5"
    >
      <div
        class="flex size-20 shrink-0 items-center justify-center rounded-full bg-light-accent-secondary text-xl font-semibold text-white shadow-md dark:bg-dark-accent-primary-btn"
        role="img"
        [attr.aria-label]="'Profilo di ' + metrics().firstName + ' ' + metrics().lastName"
      >
        {{ metrics().initials }}
      </div>
      <div class="min-w-0">
        <h1
          id="dashboard-heading"
          class="text-2xl font-semibold leading-tight break-words sm:text-3xl lg:text-4xl"
        >
          Benvenut{{ metrics().ending }} {{ metrics().firstName }}.
        </h1>
        <p class="mt-2 text-sm leading-relaxed text-on-surface-secondary">
          Il tuo workspace, a colpo d’occhio.
        </p>
      </div>
    </header>

    <dl
      class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
      aria-label="Risorse salvate nel tuo account"
    >
      @for (metric of metricCards(); track metric.label) {
        <div
          data-dashboard-metric
          class="flex min-h-44 min-w-0 lg:min-h-36 flex-col rounded-token-surface border border-token-border/50 bg-surface-elevated p-4 sm:p-5"
        >
          <dt class="min-h-10 text-sm lg:min-h-5 font-medium leading-5 text-on-surface-secondary">
            {{ metric.label }}
          </dt>
          <dd
            class="mt-2 text-2xl font-semibold sm:text-3xl leading-9 break-words tabular-nums text-on-surface-main"
          >
            {{ metric.displayValue }}
          </dd>
          <dd class="mt-2 text-xs leading-5 text-on-surface-secondary">{{ metric.description }}</dd>
        </div>
      }
    </dl>
  `,
})
export class DashboardMetricsWidgetComponent {
  readonly metrics = input.required<DashboardMetricsViewModel>()

  protected readonly metricCards = computed(() => {
    const value = this.metrics()
    return [
      { label: 'Totale molecole', value: value.totalMolecules, description: 'Personali e ChEMBL' },
      {
        label: 'Molecole personali',
        value: value.personalMolecules,
        description: 'Strutture personalizzate',
      },
      { label: 'Molecole ChEMBL', value: value.chemblMolecules, description: 'Salvate da ChEMBL' },
      { label: 'Collezioni', value: value.collections, description: 'Raccolte di molecole' },
    ].map((metric) => ({ ...metric, displayValue: numberFormat.format(metric.value) }))
  })
}
