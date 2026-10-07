import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { PercentPipe } from '@angular/common';
import { T1PredictionDTO, InferenceDTO } from '../../../Models/notebook/t1-prediction-model';

export const TOX21_ENDPOINTS = ['SR-ATAD5', 'NR-AhR', 'SR-MMP', 'SR-p53'] as const;

function validPrediction(value: InferenceDTO | undefined): value is InferenceDTO {
  return !!value && typeof value.is_positive === 'boolean' &&
    Number.isFinite(value.probability) && value.probability >= 0 && value.probability <= 1 &&
    Number.isFinite(value.threshold) && value.threshold >= 0 && value.threshold <= 1;
}

@Component({
  selector: 'm-t1-prediction-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PercentPipe],
  styleUrl: './t1-prediction-card.component.css',
  template: `
    <section aria-labelledby="tox-heading" [attr.aria-busy]="loading()">
      <h2 id="tox-heading" class="text-xl font-semibold text-light-accent-secondary dark:text-dark-accent-secondary-hc">Predizione Tox21</h2>
      <div class="m-tox-panel">
        <header class="m-tox-header">
          <h3 class="font-semibold">MercurionAI MT-21</h3>
          <a class="a text-sm" href="https://github.com/giuliomarinelli/MercurionTox21" target="_blank" rel="noopener noreferrer">Codice del modello<span class="sr-only"> (si apre in una nuova scheda)</span></a>
        </header>
        <p class="m-tox-description">Modello basato su fingerprint molecolari, addestrato sul dataset Tox21. Ogni esito riguarda un singolo endpoint.</p>
        <p class="m-tox-state" role="status">
          @if (loading()) { Predizione in corso… }
          @else if (error()) { Predizione non disponibile. Riprova senza lasciare la scheda. }
          @else if (available() === 4) { 4 endpoint disponibili }
          @else if (available()) { Risultato parziale: {{ available() }} di 4 endpoint disponibili }
          @else { Nessun risultato disponibile per questa molecola. }
        </p>
        <ul class="m-tox-results" aria-label="Risultati per endpoint Tox21">
          @for (row of rows(); track row.label) {
            <li class="m-tox-row">
              <div class="m-tox-endpoint">
                <strong>{{ row.label }}</strong>
                @if (loading()) {
                  <span class="m-tox-placeholder" aria-hidden="true"></span>
                } @else if (!error() && row.prediction; as prediction) {
                  <span class="m-tox-outcome" [class.m-tox-outcome--positive]="prediction.is_positive">{{ prediction.is_positive ? 'Positivo' : 'Negativo' }}</span>
                } @else { <span class="m-tox-missing">Non disponibile</span> }
              </div>
              <dl class="m-tox-values">
                <div><dt>Probabilità</dt><dd>
                  @if (loading()) { <span class="m-tox-placeholder" aria-hidden="true"></span> }
                  @else if (!error() && row.prediction; as prediction) { {{ prediction.probability | percent:'1.2-2' }} }
                  @else { — }
                </dd></div>
                <div><dt>Soglia</dt><dd>
                  @if (loading()) { <span class="m-tox-placeholder" aria-hidden="true"></span> }
                  @else if (!error() && row.prediction; as prediction) { {{ prediction.threshold | percent:'1.2-2' }} }
                  @else { — }
                </dd></div>
              </dl>
            </li>
          }
        </ul>
        @if (!loading() && (error() || available() < 4)) {
          <button class="m-tox-retry" type="button" (click)="retry.emit()">Riprova predizione</button>
        }
        <div class="m-tox-guide">
          <p><strong>Come leggere gli esiti.</strong> Positivo indica che la probabilità supera la soglia dell’endpoint; negativo che non la supera. Gli esiti sono quelli restituiti dal modello, prima dell’arrotondamento dei valori visualizzati.</p>
          <p>Una predizione non è una misura sperimentale. Un esito negativo non dimostra che la molecola sia sicura.</p>
        </div>
      </div>
    </section>
  `
})
export class T1PredictionCardComponent {
  readonly inference = input<T1PredictionDTO | undefined>(undefined);
  readonly loading = input(false);
  readonly error = input(false);
  readonly retry = output<void>();
  protected readonly rows = computed(() => TOX21_ENDPOINTS.map(label => {
    const prediction = this.inference()?.[label];
    return { label, prediction: validPrediction(prediction) ? prediction : undefined };
  }));
  protected readonly available = computed(() => this.rows().filter(row => row.prediction).length);
}
