import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ButtonComponent } from '../../components/common/button/button.component'
import { DashboardChartsWidgetComponent } from './dashboard/dashboard-charts-widget.component'
import { DashboardFacade } from './dashboard/dashboard.facade'
import { DashboardMetricsWidgetComponent } from './dashboard/dashboard-metrics-widget.component'
import {
  DashboardChartsPlaceholderComponent,
  DashboardLoadingComponent,
} from './dashboard/dashboard-loading.component'

@Component({
  selector: 'm-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    DashboardMetricsWidgetComponent,
    DashboardChartsWidgetComponent,
    DashboardChartsPlaceholderComponent,
    DashboardLoadingComponent,
  ],
  providers: [DashboardFacade],
  template: `
    <main
      class="main-container w-full min-w-0 space-y-0 py-6 text-on-surface-main"
      aria-label="Dashboard"
      [attr.aria-busy]="facade.state().status === 'loading'"
    >
      @if (facade.state().value; as dashboard) {
        <m-dashboard-metrics-widget class="block min-w-0" [metrics]="dashboard.metrics" />
        <div
          class="flex min-h-10 items-center text-sm text-on-surface-secondary"
          role="status"
          aria-live="polite"
        >
          @if (facade.state().status === 'loading') {
            Aggiornamento della dashboard…
          }
        </div>
        @if (facade.state().status === 'error') {
          <div
            class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-token-control border border-status-error/50 p-4"
            role="alert"
          >
            <p class="min-w-0 flex-1 text-sm leading-relaxed">
              Non è stato possibile aggiornare i dati. Restano visibili gli ultimi valori caricati.
            </p>
            <m-button variant="outline" (pressed)="facade.reload()">Riprova</m-button>
          </div>
        }
        @defer (on viewport) {
          <m-dashboard-charts-widget
            [composition]="dashboard.composition"
            [activity]="dashboard.activity"
          />
        } @placeholder {
          <div role="status" aria-label="Caricamento dei grafici">
            <m-dashboard-charts-placeholder />
          </div>
        }
      } @else if (facade.state().status === 'loading') {
        <m-dashboard-loading />
      } @else if (facade.state().status === 'error') {
        <section
          class="rounded-token-surface border border-token-border/50 bg-surface-elevated p-6"
          role="alert"
        >
          <h1 class="text-2xl font-semibold">Dashboard non disponibile</h1>
          <p class="mt-3 mb-5 max-w-prose text-sm leading-relaxed text-on-surface-secondary">
            Si è verificato un errore nel caricamento della dashboard. Puoi riprovare senza lasciare
            questa pagina.
          </p>
          <m-button variant="outline" (pressed)="facade.reload()">Riprova</m-button>
        </section>
      }
    </main>
  `,
})
export class DashboardPageComponent {
  readonly facade = inject(DashboardFacade)
}
