import { PercentPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, input, viewChild } from '@angular/core'
import { Tooltip, TooltipModule } from 'primeng/tooltip'

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
  imports: [PercentPipe, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pt-2" [attr.aria-busy]="loading()">
      <div class="flex items-start justify-between gap-2">
      <p class="min-h-12 flex items-center text-xs text-light-on-surface-secondary dark:text-dark-on-surface-secondary" role="status">
        @if (loading()) { Predizione Tox21 in corso… }
        @else if (error()) { Predizione non disponibile. }
        @else if (available() === endpoints.length) { 4 endpoint disponibili }
        @else if (available()) { Risultato parziale: {{ available() }} di {{ endpoints.length }} endpoint disponibili. }
        @else if (inference()) { Nessun risultato disponibile per questa struttura. }
        @else { Disegna una struttura valida. }
      </p>
      <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-light-on-surface-secondary hover:bg-light-accent-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-accent-primary dark:text-dark-on-surface-secondary dark:hover:bg-dark-accent-primary/10 dark:focus-visible:outline-dark-accent-primary"
        aria-label="Informazioni sulla predizione Tox21 e sulle soglie" aria-describedby="live-tox21-information" [pTooltip]="information"
        tooltipEvent="focus" tooltipPosition="top" appendTo="body" [autoHide]="false" [fitContent]="false"
        tooltipStyleClass="m-navigation-tooltip m-editor-info-tooltip" (click)="showInformation($event)"
        (mouseenter)="informationTooltip()?.activate()" (mouseleave)="hideHoverInformation($event)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="h-5 w-5 fill-current" aria-hidden="true">
          <!--!Font Awesome Pro v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.-->
          <path d="M320 96C443.7 96 544 196.3 544 320C544 443.7 443.7 544 320 544C196.3 544 96 443.7 96 320C96 196.3 196.3 96 320 96zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM272 416L256 416L256 448L384 448L384 416L336 416L336 288L256 288L256 320L304 320L304 416L272 416zM344 248L344 200L296 200L296 248L344 248z"/>
        </svg>
      </button>
      </div>
      <p class="text-right text-xs text-light-on-surface-secondary dark:text-dark-on-surface-secondary" aria-hidden="true">Probabilità</p>
      <ul class="divide-y divide-slate-200/80 dark:divide-slate-700/70" aria-label="Risultati Tox21 live">
          @for (item of rows(); track item.label) {
            <li class="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1.5">
              <div class="min-w-0">
                <strong class="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {{ item.label }}
                </strong>
                @if (loading()) {
                  <span class="block h-4 w-16 rounded bg-slate-200/70 dark:bg-slate-700/60 animate-pulse" aria-hidden="true"></span>
                } @else if (!error() && item.prediction; as prediction) {
                  <span [class]="prediction.is_positive ? 'block text-xs leading-4 font-medium text-light-error dark:text-dark-error' : 'block text-xs leading-4 font-medium text-light-on-surface-main dark:text-dark-on-surface-main'">
                    {{ prediction.is_positive ? 'Positivo' : 'Negativo' }}
                  </span>
                } @else { <span class="block text-xs leading-4 text-light-on-surface-secondary dark:text-dark-on-surface-secondary">Non disponibile</span> }
              </div>
              <dl class="text-xs tabular-nums text-light-on-surface-secondary dark:text-dark-on-surface-secondary text-right">
                <div><dt class="sr-only">Probabilità</dt><dd class="min-h-5 text-sm font-semibold text-light-on-surface-main dark:text-dark-on-surface-main">
                  @if (loading()) { <span class="inline-block h-4 w-12 rounded bg-slate-200/70 dark:bg-slate-700/60 animate-pulse" aria-hidden="true"></span> }
                  @else if (!error() && item.prediction; as prediction) { {{ prediction.probability | percent:'1.2-2' }} }
                  @else { — }
                </dd></div>
              </dl>
            </li>
          }
      </ul>
      <ng-template #information>
        <div id="live-tox21-information" class="space-y-3 text-sm leading-relaxed">
          <p>Probabilità e soglie MT-21 sono percentuali. Gli esiti usano i valori prima dell’arrotondamento.</p>
          <dl class="space-y-1" aria-label="Soglie dei quattro endpoint">
            @for (item of rows(); track item.label) {
              <div class="flex justify-between gap-4"><dt>{{ item.label }}</dt><dd>
                @if (!loading() && !error() && item.prediction; as prediction) { {{ prediction.threshold | percent:'1.2-2' }} }
                @else { Non disponibile }
              </dd></div>
            }
          </dl>
          <p>Una predizione non è una misura sperimentale. Un esito negativo non dimostra che la molecola sia sicura.</p>
        </div>
      </ng-template>
    </div>
  `
})
export class LiveTox21SummaryComponent {
  protected readonly informationTooltip = viewChild(Tooltip)
  readonly inference = input<T1PredictionDTO | null>(null)
  readonly loading = input(false)
  readonly error = input(false)

  protected showInformation(event: Event): void {
    if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus({ preventScroll: true })
    this.informationTooltip()?.activate()
  }

  protected hideHoverInformation(event: MouseEvent): void {
    if (event.currentTarget instanceof HTMLElement && event.currentTarget.ownerDocument.activeElement === event.currentTarget) return
    if (event.relatedTarget instanceof Element && event.relatedTarget.closest('.m-editor-info-tooltip')) return
    this.informationTooltip()?.deactivate()
  }

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
