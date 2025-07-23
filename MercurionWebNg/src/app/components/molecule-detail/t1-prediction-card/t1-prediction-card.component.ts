import { Component, effect, Input, input, InputSignal, Signal, signal } from '@angular/core';
import { InferenceDTO, T1PredictionDTO, T1PredictionItem } from '../../../Models/notebook/t1-prediction-model';
import { PercentPipe } from '@angular/common';

@Component({
  selector: 'app-t1-prediction-card',
  imports: [PercentPipe],
  template: `

  @if (_inference()) {
    <section class="mt-6">
      <div class="rounded-xl border-2 border-emerald-400/70 bg-emerald-50/60 dark:bg-neutral-900/80 shadow p-6 space-y-4">
        <h3 class="font-bold text-emerald-600 dark:text-emerald-400 text-lg mb-2">Predizione AI (Mercurion T1)</h3>
          @for (predWrapper of predictions(); track predWrapper) {
            <div class="flex items-center gap-3">
              <!-- <span [ngClass]="{'text-green-600': prediction[label].is_positive, 'text-red-600': !prediction[label].is_positive}"> -->
                <!-- <svg *ngIf="prediction[label].is_positive" ... /> icona check -->
                <!-- <svg *ngIf="!prediction[label].is_positive" ... /> icona x -->
              <!-- </span> -->
              <span class="font-semibold">{{ predWrapper.label }}</span>
              <span class="text-sm text-gray-500 ml-2">({{ predWrapper.prediction.probability | percent:'1.0-2' }})</span>
              <span class="ml-auto text-xs italic text-slate-400">Soglia: {{ predWrapper.prediction.threshold }}</span>
            </div>
            }
        <!-- <div *ngIf="predictionError" class="text-red-500 text-sm">Errore durante la predizione. Riprova più tardi.</div> -->
      </div>
    </section>
  }

  `
})
export class T1PredictionCardComponent {


  protected _inference = signal<T1PredictionDTO | undefined>(undefined)

  @Input()
  set inference(inference: T1PredictionDTO | undefined) {
    this._inference.set(inference)
  }

  protected predictions = signal<T1PredictionItem[]>([])

  constructor() {
    effect(() => {
      if (!this._inference()) {
        return
      }
      this.predictions().length === 0 && this.predictions.set(Object.entries(this._inference() as T1PredictionDTO)
        .filter(([, val]) => !!val)
        .map(([label, val]) => ({ label, prediction: val })))
    })
  }

}
