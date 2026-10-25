import { PercentPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

import type {
  T1PredictionDTO,
  InferenceDTO
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
      <p class="mb-2 min-h-10 text-sm text-light-on-surface-secondary dark:text-dark-on-surface-secondary" role="status">
        @if (loading()) { Predizione Tox21 in corso… }
        @else if (error()) { Predizione non disponibile. }
        @else if (available() === endpoints.length) { 4 endpoint disponibili }
        @else if (available()) { Risultato parziale: {{ available() }} di {{ endpoints.length }} endpoint disponibili. }
        @else if (inference()) { Nessun risultato disponibile per questa struttura. }
        @else { Disegna una struttura valida per avviare la predizione. }
      </p>
      <ul class="divide-y divide-slate-200/80 dark:divide-slate-700/70" aria-label="Risultati Tox21 live">
          @for (item of rows(); track item.label) {
            <li class="grid min-h-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
              <div class="min-w-0">
                <strong class="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {{ item.label }}
                </strong>
                @if (loading()) {
                  <span class="inline-block h-4 w-16 rounded bg-slate-200/70 dark:bg-slate-700/60 animate-pulse" aria-hidden="true"></span>
                } @else if (!error() && item.prediction; as prediction) {
                  <span [class]="prediction.is_positive ? 'text-xs font-medium text-light-error dark:text-dark-error' : 'text-xs font-medium text-light-on-surface-main dark:text-dark-on-surface-main'">
                    {{ prediction.is_positive ? 'Positivo' : 'Negativo' }}
                  </span>
                } @else { <span class="text-xs text-light-on-surface-secondary dark:text-dark-on-surface-secondary">Non disponibile</span> }
              </div>
              <dl class="text-xs tabular-nums text-light-on-surface-secondary dark:text-dark-on-surface-secondary text-right">
                <div><dt>Probabilità</dt><dd class="min-h-5 text-sm font-semibold text-light-on-surface-main dark:text-dark-on-surface-main">
                  @if (loading()) { <span class="inline-block h-4 w-12 rounded bg-slate-200/70 dark:bg-slate-700/60 animate-pulse" aria-hidden="true"></span> }
                  @else if (!error() && item.prediction; as prediction) { {{ prediction.probability | percent:'1.2-2' }} }
                  @else { — }
                </dd></div>
                <div class="mt-1"><dt>Soglia</dt><dd class="min-h-4">
                  @if (loading()) { <span class="inline-block h-4 w-12 rounded bg-slate-200/70 dark:bg-slate-700/60 animate-pulse" aria-hidden="true"></span> }
                  @else if (!error() && item.prediction; as prediction) { {{ prediction.threshold | percent:'1.2-2' }} }
                  @else { — }
                </dd></div>
              </dl>
            </li>
          }
      </ul>
        <p class="mt-3 text-xs leading-relaxed text-light-on-surface-secondary dark:text-dark-on-surface-secondary">
          Esiti MT-21 prima dell’arrotondamento; probabilità e soglia sono mostrate in percentuale. Una predizione non è una misura sperimentale e un esito negativo non dimostra che la molecola sia sicura.
        </p>
    </div>
  `
})
export class LiveTox21SummaryComponent {
  readonly inference = input<T1PredictionDTO | null>(null)
  readonly loading = input(false)
  readonly error = input(false)

  protected readonly endpoints = LIVE_TOX21_ENDPOINTS

  protected readonly rows = computed<{ label: string; prediction?: InferenceDTO }[]>(() => {
    const inference = this.inference()
    return this.endpoints.map(label => {
      const prediction = inference?.[label]
      const valid = prediction && typeof prediction.is_positive === 'boolean' &&
        Number.isFinite(prediction.probability) && prediction.probability >= 0 && prediction.probability <= 1 &&
        Number.isFinite(prediction.threshold) && prediction.threshold >= 0 && prediction.threshold <= 1
      return { label, prediction: valid ? prediction : undefined }
    })
  })
  protected readonly available = computed(() => this.rows().filter(row => row.prediction).length)
}
