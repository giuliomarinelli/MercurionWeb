import { PercentPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

import type {
  T1PredictionDTO,
  T1PredictionItem
} from '../../../Models/notebook/t1-prediction-model'

const LIVE_TOX21_ENDPOINTS = [
  'SR-ATAD5',
  'NR-AhR',
  'SR-MMP',
  'SR-p53'
] as const satisfies readonly (keyof T1PredictionDTO)[]

@Component({
  selector: 'm-live-tox21-summary',
  imports: [PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pt-2" [attr.aria-busy]="loading()">
      @if (loading()) {
        <div class="space-y-2" role="status" aria-label="Predizione Tox21 in corso">
          @for (endpoint of endpoints; track endpoint) {
            <div class="h-8 rounded-md bg-slate-200/70 dark:bg-slate-700/60 animate-pulse"></div>
          }
        </div>
      } @else if (error()) {
        <p class="py-3 text-sm text-light-error dark:text-dark-error">
          Predizione non disponibile.
        </p>
      } @else if (predictions().length) {
        <div class="divide-y divide-slate-200/80 dark:divide-slate-700/70">
          @for (item of predictions(); track item.label) {
            <div class="grid grid-cols-[0.75rem_1fr_auto] items-center gap-2 py-2">
              <span
                class="size-2.5 rounded-full"
                [class.bg-light-error]="item.prediction.is_positive"
                [class.dark:bg-dark-error]="item.prediction.is_positive"
                [class.bg-emerald-600]="!item.prediction.is_positive"
                [class.dark:bg-emerald-400]="!item.prediction.is_positive"
                aria-hidden="true"
              ></span>

              <div class="min-w-0">
                <span class="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {{ item.label }}
                </span>
                <span
                  class="text-[0.68rem] font-medium"
                  [class.text-light-error]="item.prediction.is_positive"
                  [class.dark:text-dark-error]="item.prediction.is_positive"
                  [class.text-emerald-700]="!item.prediction.is_positive"
                  [class.dark:text-emerald-300]="!item.prediction.is_positive"
                >
                  {{ item.prediction.is_positive ? 'Positivo' : 'Negativo' }}
                </span>
              </div>

              <span
                class="text-xs tabular-nums text-slate-500 dark:text-slate-400"
                [title]="'Soglia: ' + item.prediction.threshold"
              >
                {{ item.prediction.probability | percent:'1.0-1' }}
              </span>
            </div>
          }
        </div>

        <p class="mt-3 text-[0.65rem] leading-snug text-slate-500 dark:text-slate-400">
          Output predittivo MT-21 sui quattro endpoint selezionati; non sostituisce una valutazione tossicologica completa.
        </p>
      } @else {
        <p class="py-3 text-sm text-slate-500 dark:text-slate-400">
          Disegna una struttura valida per avviare la predizione.
        </p>
      }
    </div>
  `
})
export class LiveTox21SummaryComponent {
  readonly inference = input<T1PredictionDTO | null>(null)
  readonly loading = input(false)
  readonly error = input(false)

  protected readonly endpoints = LIVE_TOX21_ENDPOINTS

  protected readonly predictions = computed<T1PredictionItem[]>(() => {
    const inference = this.inference()
    if (!inference) return []

    return this.endpoints.flatMap(label => {
      const prediction = inference[label]
      return prediction ? [{ label, prediction }] : []
    })
  })
}
