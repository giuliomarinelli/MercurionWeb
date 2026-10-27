import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'm-dashboard-charts-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div class="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2" aria-hidden="true">
      @for (card of [0, 1]; track card) {
        <div
          data-dashboard-chart
          class="flex min-h-[31rem] sm:min-h-[29rem] min-w-0 flex-col rounded-token-surface border border-token-border/50 bg-surface-elevated p-4 sm:p-5"
        >
          <div class="animate-pulse motion-reduce:animate-none">
            <div class="h-6 w-40 max-w-full rounded bg-surface-secondary"></div>
            <div class="mt-2 h-10 rounded bg-surface-secondary"></div>
            <div class="mt-3 h-48 rounded-token-control bg-surface-secondary"></div>
            <div class="mt-3 h-28 rounded-token-control bg-surface-secondary"></div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardChartsPlaceholderComponent {}

@Component({
  selector: 'm-dashboard-loading',
  imports: [DashboardChartsPlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div role="status" aria-label="Caricamento della dashboard">
      <span class="sr-only">Caricamento della dashboard…</span>
      <div aria-hidden="true">
        <div data-dashboard-heading class="flex min-h-32 items-center lg:min-h-24 gap-4 sm:gap-5">
          <div
            class="size-20 shrink-0 animate-pulse rounded-full bg-surface-secondary motion-reduce:animate-none"
          ></div>
          <div class="min-w-0 flex-1 animate-pulse motion-reduce:animate-none">
            <div class="h-9 w-64 max-w-full rounded bg-surface-secondary"></div>
            <div class="mt-2 h-5 w-52 max-w-full rounded bg-surface-secondary"></div>
          </div>
        </div>
        <div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          @for (card of [0, 1, 2, 3]; track card) {
            <div
              data-dashboard-metric
              class="min-h-44 min-w-0 lg:min-h-36 rounded-token-surface border border-token-border/50 bg-surface-elevated p-4 sm:p-5"
            >
              <div class="animate-pulse motion-reduce:animate-none">
                <div class="h-10 rounded lg:h-5 bg-surface-secondary"></div>
                <div class="mt-2 h-9 w-16 max-w-full rounded bg-surface-secondary"></div>
                <div class="mt-2 h-5 rounded bg-surface-secondary"></div>
              </div>
            </div>
          }
        </div>
      </div>
      <div class="h-10" aria-hidden="true"></div>
      <m-dashboard-charts-placeholder />
    </div>
  `,
})
export class DashboardLoadingComponent {}
