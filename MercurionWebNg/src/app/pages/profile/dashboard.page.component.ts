// ====================== IMPORTS ======================
import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  OnInit,
  OnDestroy,
  effect,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  Chart,
  ChartConfiguration,
  registerables,
} from 'chart.js';

import { AccountService } from '../../services/account.service';
import { ProfileDTO } from '../../Models/account/account.models';
import { ThemeManagerService } from '../../services/context/theme-manager.service';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { AppContextService } from '../../services/context/app-context.service';

Chart.register(...registerables);

type ActivityPoint = {
  dayLabel: string;
  molecules: number;
  collections: number;
};

type ChartPalette = {
  text: string;
  grid: string;
  bgMolecules: string;
  bgCollections: string;
  doughnut: [string, string, string];
};

// ====================== COMPONENT ======================
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ClassicSpinnerComponent],
  template: `
    <section class="main-container py-8 cursor-default">
      @if (profile) {

        <!-- HEADER UTENTE -->
        <div class="flex flex-col items-center mb-12">
          <div
            class="rounded-full w-20 h-20 text-xl font-semibold
                   flex items-center justify-center
                   bg-light-accent-secondary dark:bg-dark-accent-primary-btn text-white shadow-md mb-4">
            {{ initials }}
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl text-center tracking-wide">
            Benvenut{{ ending }} {{ profile.firstName }}.
          </h1>
        </div>

        <!-- GRID STATISTICHE + DOUGHNUT -->
        <div
          class="mx-auto max-w-5xl grid gap-8
                 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]
                 items-start">

          <!-- METRICHE -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              class="rounded-lg border border-slate-300/70 dark:border-slate-700/70
                     bg-blue-50 dark:bg-[#050816] px-4 py-4 shadow-sm">
              <p class="text-sm text-neutral-950 dark:text-slate-400 font-semibold">
                Totale molecole
              </p>
              <p class="text-3xl font-semibold mt-1">
                {{ profile.personalMoleculeCount + profile.chemblMoleculeCount }}
              </p>
            </div>

            <div
              class="rounded-lg border border-slate-300/70 dark:border-slate-700/70
                     bg-blue-50 dark:bg-[#050816] px-4 py-4 shadow-sm">
              <p class="text-sm text-neutral-950 dark:text-slate-400 font-semibold">
                Molecole personali
              </p>
              <p class="text-3xl font-semibold mt-1">
                {{ profile.personalMoleculeCount }}
              </p>
            </div>

            <div
              class="rounded-lg border border-slate-300/70 dark:border-slate-700/70
                     bg-blue-50 dark:bg-[#050816] px-4 py-4 shadow-sm">
              <p class="text-sm text-neutral-950 dark:text-slate-400 font-semibold">
                Molecole ChEMBL
              </p>
              <p class="text-3xl font-semibold mt-1">
                {{ profile.chemblMoleculeCount }}
              </p>
            </div>

            <div
              class="rounded-lg border border-slate-300/70 dark:border-slate-700/70
                     bg-blue-50 dark:bg-[#050816] px-4 py-4 shadow-sm">
              <p class="text-sm text-neutral-950 dark:text-slate-400 font-semibold">
                Collezioni
              </p>
              <p class="text-3xl font-semibold mt-1">
                {{ profile.collectionCount }}
              </p>
            </div>
          </div>

          <!-- DOUGHNUT -->
          <div
            class="rounded-lg border border-slate-300/70 dark:border-slate-700/70
                  bg-blue-50 dark:bg-[#050816] px-4 py-4 shadow-sm
                   h-[260px] sm:h-[300px]">
            <h2 class="text-sm font-semibold mb-2 text-neutral-950 dark:text-slate-200">
              Composizione workspace
            </h2>
            <div class="relative h-[210px] sm:h-[250px]">
              <canvas #overviewChart></canvas>
            </div>
          </div>
        </div>

        <!-- ATTIVITÀ RECENTE -->
        <section class="mx-auto max-w-5xl mt-12">
          <div
            class="rounded-lg border border-slate-300/70 dark:border-slate-700/70
                   bg-blue-50 dark:bg-[#050816] px-4 py-4 shadow-sm
                   h-[260px] sm:h-[360px]">
            <h2 class="text-sm font-semibold mb-2 text-neutral-950 dark:text-slate-200">
              Attività recente
            </h2>
            <p class="text-xs text-neutral-950 dark:text-slate-300 mb-2">
              Molecole e collezioni visitate, create o modificate negli ultimi giorni.
            </p>
            <div class="relative h-[210px] sm:h-[270px]">
              <canvas #activityChart></canvas>
            </div>
          </div>
        </section>
      } @else if (loading()) {
        <div class="absolute inset-0 flex justify-center items-center max-w-5xl mx-auto">
          <app-classic-spinner [size]="60" />
        </div>
      } @else if (serverError()) {
        <p class="text-light-error dark:text-dark-error">Si è verificato un errore nel caricamento della dashboard.</p>
      }
    </section>
  `,
})
export class DashboardPageComponent implements OnInit, OnDestroy {

  // ========= DEPS =========
  private readonly accountService = inject(AccountService)
  private readonly themeManager = inject(ThemeManagerService)
  private readonly appContext = inject(AppContextService)
  // ========================


  private prSub?: Subscription
  private reSub?: Subscription

  private subArg = {
    next: (profile: ProfileDTO) => {
      this.profile = profile;

      if (profile.gender === 'F') {
        this.ending = 'a';
      }
      this.initials = profile.firstName.slice(0, 1) + profile.lastName.slice(0, 1)

      this.loading.set(false)

      this.tryBuildCharts()
    },
    error: () => this.serverError.set(true)
  }

  // ========= STATE =========
  profile: ProfileDTO | null = null
  ending: 'o' | 'a' = 'o'
  initials = ''

  // ========= CANVAS & CHARTS =========
  private overviewCanvas?: HTMLCanvasElement
  private activityCanvas?: HTMLCanvasElement

  private overviewChart?: Chart<'doughnut'>
  private activityChart?: Chart<'bar'>

  loading = signal<boolean>(true)
  serverError = signal<boolean>(false)

  // ViewChild come setter: viene chiamato quando i canvas entrano in DOM
  @ViewChild('overviewChart')
  set overviewChartSetter(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this.overviewCanvas = ref?.nativeElement
    this.tryBuildCharts()
  }

  @ViewChild('activityChart')
  set activityChartSetter(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this.activityCanvas = ref?.nativeElement
    this.tryBuildCharts()
  }

  constructor() {
    // reagisci al cambio tema: ricostruisco i grafici con la palette corretta
    effect(() => {
      const _mode = this.currentTheme() // dipendenza reattiva
      this.tryBuildCharts()
    })
    effect(() => {
      const t = this.appContext.refetchDashboardAddedTick()
      if (t === 0) {
        return
      }
      this.reSub = this.accountService.getProfileRegistry().subscribe(this.subArg)
    })
  }

  // --------- LIFECYCLE ---------
  ngOnInit(): void {
    this.prSub = this.accountService.getProfileRegistry().subscribe(this.subArg)
  }

  ngOnDestroy(): void {
    this.prSub?.unsubscribe()
    this.overviewChart?.destroy()
    this.activityChart?.destroy()
    this.reSub?.unsubscribe()
  }

  // --------- HELPERS TEMA / PALETTE ---------
  private currentTheme(): 'light' | 'dark' {
    return this.themeManager.theme() === 'dark' ? 'dark' : 'light'
  }

  private getChartPalette(theme: 'light' | 'dark'): ChartPalette {
    if (theme === 'dark') {
      return {
        text: '#cad5e2',
        grid: '#47556955',
        bgMolecules: '#38bdf8',
        bgCollections: '#a855f7',
        doughnut: ['#22c55e', '#0ea5e9', '#a855f7'],
      }
    }

    return {
      text: '#0f172a',
      grid: '#cad5e2',
      bgMolecules: '#0956FB',
      bgCollections: '#B200C2',
      doughnut: ['#7A33FF', '#00754E', '#D10038'],
    }
  }

  // --------- BUILD ENTRYPOINT ---------
  private tryBuildCharts(): void {
    if (!this.profile) return

    if (this.overviewCanvas) {
      this.buildOverviewChart()
    }
    if (this.activityCanvas) {
      this.buildActivityChart()
    }
  }

  // --------- DOUGHNUT ---------
  private buildOverviewChart(): void {
    if (!this.profile || !this.overviewCanvas) return

    const ctx = this.overviewCanvas.getContext('2d')
    if (!ctx) return

    this.overviewChart?.destroy()

    const palette = this.getChartPalette(this.currentTheme())

    // 👉 dati reali
    const realData = [
      this.profile.personalMoleculeCount,
      this.profile.chemblMoleculeCount,
      this.profile.collectionCount,
    ]

    // 👉 partenza a 0 per forzare l'animazione
    const initialData = [0, 0, 0]

    this.overviewChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Molecole personali', 'Molecole ChEMBL', 'Collezioni'],
        datasets: [
          {
            data: initialData,
            backgroundColor: palette.doughnut,
            borderColor: 'transparent',
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        animation: {
          duration: 700,
          easing: 'easeOutCubic',
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: palette.text,
              boxWidth: 14,
            },
          },
        },
      },
    })

    // 🔥 step 2: set dei valori reali → parte l’animazione
    queueMicrotask(() => {
      if (!this.overviewChart) return
      const ds = this.overviewChart.data.datasets[0] as any
      ds.data = realData
      this.overviewChart.update()
    })
  }


  // --------- BAR ATTIVITÀ ---------
  private buildActivityChart(): void {
    if (!this.profile || !this.activityCanvas) return

    const ctx = this.activityCanvas.getContext('2d')
    if (!ctx) return

    const points = this.buildActivityPoints(this.profile, 7)
    if (points.length === 0) {
      this.activityChart?.destroy()
      this.activityChart = undefined
      return
    }

    this.activityChart?.destroy()

    const palette = this.getChartPalette(this.currentTheme())

    const labels = points.map((p) => p.dayLabel)
    const molecules = points.map((p) => p.molecules)
    const collections = points.map((p) => p.collections)

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Molecole',
            data: molecules,
            backgroundColor: palette.bgMolecules,
            borderRadius: 4,
          },
          {
            label: 'Collezioni',
            data: collections,
            backgroundColor: palette.bgCollections,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            ticks: { color: palette.text },
            grid: { color: palette.grid },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { color: palette.text, precision: 0 },
            grid: { color: palette.grid },
          },
        },
        plugins: {
          colors: {
            enabled: false,
          } as any,
          legend: {
            position: 'bottom',
            labels: { color: palette.text },
          },
        },
      },
    }

    this.activityChart = new Chart(ctx, config)
  }

  // --------- UTILS ---------
  private buildActivityPoints(
    profile: ProfileDTO,
    days: number = 7,
  ): ActivityPoint[] {
    const items = profile.recentHistory ?? [];
    const buckets = new Map<string, { molecules: number; collections: number }>()

    for (const item of items) {
      const ts = Number(item.touchedAt)
      if (Number.isNaN(ts)) continue

      const d = new Date(ts)
      d.setHours(0, 0, 0, 0)
      const key = d.toISOString().slice(0, 10)

      const bucket = buckets.get(key) ?? { molecules: 0, collections: 0 }

      if (item.itemEntity === 'molecule_collection_items') {
        bucket.molecules++
      } else if (item.itemEntity === 'molecule_collections') {
        bucket.collections++
      }

      buckets.set(key, bucket)
    }

    const result: ActivityPoint[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)

      const key = d.toISOString().slice(0, 10)
      const bucket = buckets.get(key) ?? { molecules: 0, collections: 0 }

      result.push({
        dayLabel: d.toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
        }),
        molecules: bucket.molecules,
        collections: bucket.collections,
      })
    }

    return result
  }
}
