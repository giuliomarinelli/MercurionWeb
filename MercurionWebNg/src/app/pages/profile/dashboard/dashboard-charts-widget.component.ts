import { RouterLink } from '@angular/router'
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core'
import { Chart, ChartConfiguration, registerables } from 'chart.js'
import { ThemeManagerService } from '../../../services/context/theme-manager.service'
import { ActivityPointViewModel, WorkspaceCompositionViewModel } from './dashboard-widget.models'

Chart.register(...registerables)
const numberFormat = new Intl.NumberFormat('it-IT')

@Component({
  selector: 'm-dashboard-charts-widget',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div class="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
      <section
        data-dashboard-chart
        class="flex min-h-124 sm:min-h-116 min-w-0 flex-col rounded-token-surface border border-token-border/50 bg-surface-elevated p-4 sm:p-5"
        aria-labelledby="dashboard-composition-heading"
      >
        <header class="min-h-28 sm:min-h-20">
          <h2 id="dashboard-composition-heading" class="text-lg font-semibold">
            Composizione del workspace
          </h2>
          <p class="mt-2 text-sm leading-5 text-on-surface-secondary">
            Molecole personali, ChEMBL e collezioni salvate.
          </p>
        </header>
        <div class="relative mt-3 h-48 shrink-0">
          @if (hasComposition()) {
            <canvas
              class="max-w-full"
              #overview
              role="img"
              aria-label="Grafico a torta della composizione del workspace tra molecole e collezioni"
              aria-describedby="dashboard-composition-data"
            ></canvas>
          } @else {
            <div
              class="flex h-full items-center justify-center rounded-token-control border border-dashed border-token-border/50 px-5 text-center"
            >
              <div class="max-w-64">
                <h3 id="dashboard-empty-heading" class="text-base font-semibold">
                  Il tuo workspace è pronto
                </h3>
                <p class="mt-2 text-sm leading-relaxed text-on-surface-secondary">
                  Salva una molecola o crea una collezione per iniziare.
                </p>
                <a
                  routerLink="/molecules"
                  class="mt-2 inline-flex min-h-11 items-center gap-2 rounded text-sm font-semibold text-accent-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-token-focus"
                  >Esplora le mie molecole <span aria-hidden="true">→</span></a
                >
              </div>
            </div>
          }
        </div>
        <dl id="dashboard-composition-data" class="mt-3 grid gap-1">
          @for (series of compositionSeries(); track series.label; let i = $index) {
            <div class="flex min-w-0 items-center gap-2">
              <dt class="min-w-0 flex-1">
                <button
                  type="button"
                  class="flex min-h-9 w-full items-center gap-2 rounded px-1 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-token-focus disabled:cursor-default"
                  [disabled]="!hasComposition()"
                  [attr.aria-pressed]="!hiddenComposition().includes(i)"
                  (click)="toggleComposition(i)"
                >
                  <span
                    class="size-3 shrink-0 rounded-sm"
                    [style.background-color]="series.color"
                    aria-hidden="true"
                  ></span>
                  <span [class.line-through]="hiddenComposition().includes(i)">{{
                    series.label
                  }}</span>
                </button>
              </dt>
              <dd class="shrink-0 text-sm font-semibold tabular-nums">{{ series.displayValue }}</dd>
            </div>
          }
        </dl>
      </section>

      <section
        data-dashboard-chart
        class="flex min-h-[31rem] sm:min-h-[29rem] min-w-0 flex-col rounded-token-surface border border-token-border/50 bg-surface-elevated p-4 sm:p-5"
        aria-labelledby="dashboard-activity-heading"
      >
        <header class="min-h-28 sm:min-h-20">
          <h2 id="dashboard-activity-heading" class="text-lg font-semibold">Attività recente</h2>
          <p class="mt-2 text-sm leading-5 text-on-surface-secondary">
            Risorse nella cronologia degli ultimi 7 giorni: ogni risorsa è conteggiata una volta al
            giorno.
          </p>
        </header>
        <div class="relative mt-3 h-48 shrink-0">
          @if (hasActivity()) {
            <canvas
              class="max-w-full"
              #activity
              role="img"
              aria-label="Grafico dell'attività recente su molecole e collezioni"
              aria-describedby="dashboard-activity-description"
            ></canvas>
          } @else {
            <div
              class="flex h-full items-center justify-center rounded-token-control border border-dashed border-token-border/50 px-5 text-center"
            >
              <p class="max-w-64 text-sm leading-relaxed text-on-surface-secondary">
                Nessuna attività nella cronologia degli ultimi 7 giorni.
              </p>
            </div>
          }
        </div>
        <p id="dashboard-activity-description" class="sr-only">
          I dati esatti sono disponibili nella tabella Dati giorno per giorno.
        </p>
        <div
          class="mt-3 flex flex-wrap gap-x-4 gap-y-1"
          role="group"
          aria-label="Serie del grafico attività"
        >
          @for (series of activitySeries(); track series.label; let i = $index) {
            <button
              type="button"
              class="inline-flex min-h-9 items-center gap-2 rounded px-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-token-focus disabled:cursor-default"
              [disabled]="!hasActivity()"
              [attr.aria-pressed]="!hiddenActivity().includes(i)"
              (click)="toggleActivity(i)"
            >
              <span
                class="size-3 shrink-0 rounded-sm"
                [style.background-color]="series.color"
                aria-hidden="true"
              ></span>
              <span [class.line-through]="hiddenActivity().includes(i)">{{ series.label }}</span>
            </button>
          }
        </div>
        <details class="mt-3 border-t border-token-border/40 pt-2">
          <summary
            class="min-h-9 cursor-pointer rounded py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-token-focus"
          >
            Dati giorno per giorno
          </summary>
          <table class="mt-2 w-full table-fixed text-left text-xs tabular-nums sm:text-sm">
            <caption class="sr-only">
              Risorse distinte per giorno presenti nella cronologia
            </caption>
            <thead class="text-on-surface-secondary">
              <tr>
                <th scope="col" class="py-2 font-medium">Giorno</th>
                <th scope="col" class="py-2 text-right font-medium">Molecole</th>
                <th scope="col" class="py-2 text-right font-medium">Collezioni</th>
              </tr>
            </thead>
            <tbody>
              @for (point of activity(); track point.dayLabel) {
                <tr class="border-t border-token-border/30">
                  <th scope="row" class="py-2 font-medium">{{ point.dayLabel }}</th>
                  <td class="py-2 text-right">{{ formatCount(point.molecules) }}</td>
                  <td class="py-2 text-right">{{ formatCount(point.collections) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </details>
      </section>
    </div>
  `,
})
export class DashboardChartsWidgetComponent implements OnDestroy {
  readonly composition = input.required<WorkspaceCompositionViewModel>()
  readonly activity = input.required<ActivityPointViewModel[]>()
  private readonly theme = inject(ThemeManagerService)
  private readonly overview = viewChild<ElementRef<HTMLCanvasElement>>('overview')
  private readonly activityCanvas = viewChild<ElementRef<HTMLCanvasElement>>('activity')
  private overviewChart?: Chart<'doughnut'>
  private activityChart?: Chart<'bar'>

  protected readonly hiddenComposition = signal<number[]>([])
  protected readonly hiddenActivity = signal<number[]>([])
  protected readonly hasComposition = computed(() =>
    this.composition().values.some((value) => value > 0)
  )
  protected readonly hasActivity = computed(() =>
    this.activity().some((point) => point.molecules > 0 || point.collections > 0)
  )
  protected readonly palette = computed(() =>
    this.theme.theme() === 'dark'
      ? {
          text: '#cad5e2',
          grid: '#47556955',
          molecules: '#38bdf8',
          collections: '#a855f7',
          doughnut: ['#22c55e', '#0ea5e9', '#a855f7'],
        }
      : {
          text: '#0f172a',
          grid: '#cad5e2',
          molecules: '#0956FB',
          collections: '#B200C2',
          doughnut: ['#7A33FF', '#00754E', '#D10038'],
        }
  )
  protected readonly compositionSeries = computed(() =>
    this.composition().labels.map((label, index) => ({
      label,
      displayValue: numberFormat.format(this.composition().values[index] ?? 0),
      color: this.palette().doughnut[index],
    }))
  )
  protected readonly activitySeries = computed(() => [
    { label: 'Molecole', color: this.palette().molecules },
    { label: 'Collezioni', color: this.palette().collections },
  ])

  constructor() {
    // Chart.js must see the final canvas geometry, including deferred/empty branches.
    afterRenderEffect(() => this.render())
  }

  protected formatCount(value: number): string {
    return numberFormat.format(value)
  }

  protected toggleComposition(index: number): void {
    if (!this.overviewChart) {
      return
    }
    this.overviewChart.toggleDataVisibility(index)
    this.overviewChart.update('none')
    this.hiddenComposition.update((hidden) =>
      hidden.includes(index) ? hidden.filter((value) => value !== index) : [...hidden, index]
    )
  }

  protected toggleActivity(index: number): void {
    if (!this.activityChart) {
      return
    }
    const visible = this.activityChart.isDatasetVisible(index)
    this.activityChart.setDatasetVisibility(index, !visible)
    this.activityChart.update('none')
    this.hiddenActivity.update((hidden) =>
      visible ? [...hidden, index] : hidden.filter((value) => value !== index)
    )
  }

  ngOnDestroy(): void {
    this.overviewChart?.destroy()
    this.activityChart?.destroy()
  }

  private render(): void {
    const palette = this.palette()
    const composition = this.composition()
    const points = this.activity()
    const overviewCanvas = this.overview()?.nativeElement
    const activityCanvas = this.activityCanvas()?.nativeElement
    this.overviewChart?.destroy()
    this.activityChart?.destroy()
    this.overviewChart = undefined
    this.activityChart = undefined

    if (overviewCanvas) {
      this.overviewChart = new Chart(overviewCanvas, {
        type: 'doughnut',
        data: {
          labels: composition.labels,
          datasets: [
            {
              data: composition.values,
              backgroundColor: palette.doughnut,
              borderColor: 'transparent',
              hoverOffset: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          locale: 'it-IT',
          cutout: '65%',
          plugins: { legend: { display: false } },
        },
      })
      for (const index of untracked(this.hiddenComposition)) {
        this.overviewChart.toggleDataVisibility(index)
      }
      this.overviewChart.update('none')
    }

    if (activityCanvas) {
      const config: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: points.map((point) => point.dayLabel),
          datasets: [
            {
              label: 'Molecole',
              data: points.map((point) => point.molecules),
              backgroundColor: palette.molecules,
              borderRadius: 3,
            },
            {
              label: 'Collezioni',
              data: points.map((point) => point.collections),
              backgroundColor: palette.collections,
              borderRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          locale: 'it-IT',
          scales: {
            x: {
              stacked: true,
              ticks: { color: palette.text, maxRotation: 0, font: { size: 11 } },
              grid: { display: false },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: { color: palette.text, precision: 0, maxTicksLimit: 5 },
              grid: { color: palette.grid },
            },
          },
          plugins: { colors: { enabled: false }, legend: { display: false } },
        },
      }
      this.activityChart = new Chart(activityCanvas, config)
      for (const index of untracked(this.hiddenActivity)) {
        this.activityChart.setDatasetVisibility(index, false)
      }
      this.activityChart.update('none')
    }
  }
}
