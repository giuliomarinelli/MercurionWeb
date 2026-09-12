import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, inject, input, viewChild } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ThemeManagerService } from '../../../services/context/theme-manager.service';
import { ActivityPointViewModel, WorkspaceCompositionViewModel } from './dashboard-widget.models';

Chart.register(...registerables);

@Component({
  selector: 'm-dashboard-charts-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-slate-300/70 dark:border-slate-700/70
                bg-blue-50 dark:bg-[#050816] px-4 py-4 shadow-sm h-[260px] sm:h-[300px]">
      <h2 class="text-sm font-semibold mb-2 text-neutral-950 dark:text-slate-200">Composizione workspace</h2>
      <div class="relative h-[210px] sm:h-[250px]">
        <canvas #overview role="img" aria-label="Grafico a torta della composizione del workspace tra molecole e collezioni"></canvas>
      </div>
    </div>
    <section class="mx-auto max-w-5xl mt-12">
      <div class="rounded-lg border border-slate-300/70 dark:border-slate-700/70
                  bg-blue-50 dark:bg-[#050816] px-4 py-4 shadow-sm h-[260px] sm:h-[360px]">
        <h2 class="text-sm font-semibold mb-2 text-neutral-950 dark:text-slate-200">Attività recente</h2>
        <p class="text-xs text-neutral-950 dark:text-slate-300 mb-2">
          Molecole e collezioni visitate, create o modificate negli ultimi giorni.
        </p>
        <div class="relative h-[210px] sm:h-[270px]">
          <canvas #activity role="img" aria-label="Grafico dell'attività recente su molecole e collezioni"></canvas>
        </div>
      </div>
    </section>
  `
})
export class DashboardChartsWidgetComponent implements AfterViewInit, OnDestroy {
  readonly composition = input.required<WorkspaceCompositionViewModel>();
  readonly activity = input.required<ActivityPointViewModel[]>();
  private readonly theme = inject(ThemeManagerService);
  private readonly overview = viewChild<ElementRef<HTMLCanvasElement>>('overview');
  private readonly activityCanvas = viewChild<ElementRef<HTMLCanvasElement>>('activity');
  private overviewChart?: Chart<'doughnut'>;
  private activityChart?: Chart<'bar'>;

  constructor() {
    effect(() => this.render());
    effect(() => {
      this.theme.theme();
      this.render();
    });
  }

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnDestroy(): void {
    this.overviewChart?.destroy();
    this.activityChart?.destroy();
  }

  private render(): void {
    const overviewCanvas = this.overview()?.nativeElement;
    const activityCanvas = this.activityCanvas()?.nativeElement;
    if (!overviewCanvas || !activityCanvas) return;

    this.overviewChart?.destroy();
    this.activityChart?.destroy();
    const palette = this.theme.theme() === 'dark'
      ? { text: '#cad5e2', grid: '#47556955', molecules: '#38bdf8', collections: '#a855f7', doughnut: ['#22c55e', '#0ea5e9', '#a855f7'] }
      : { text: '#0f172a', grid: '#cad5e2', molecules: '#0956FB', collections: '#B200C2', doughnut: ['#7A33FF', '#00754E', '#D10038'] };

    this.overviewChart = new Chart(overviewCanvas, {
      type: 'doughnut',
      data: { labels: this.composition().labels, datasets: [{ data: this.composition().values, backgroundColor: palette.doughnut, borderColor: 'transparent', hoverOffset: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: palette.text, boxWidth: 14 } } } }
    });

    const points = this.activity();
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: points.map((point) => point.dayLabel),
        datasets: [
          { label: 'Molecole', data: points.map((point) => point.molecules), backgroundColor: palette.molecules, borderRadius: 4 },
          { label: 'Collezioni', data: points.map((point) => point.collections), backgroundColor: palette.collections, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { stacked: true, ticks: { color: palette.text }, grid: { color: palette.grid } },
          y: { stacked: true, beginAtZero: true, ticks: { color: palette.text, precision: 0 }, grid: { color: palette.grid } }
        },
        plugins: { colors: { enabled: false }, legend: { position: 'bottom', labels: { color: palette.text } } }
      }
    };
    this.activityChart = new Chart(activityCanvas, config);
  }
}
