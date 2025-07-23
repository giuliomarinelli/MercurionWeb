import { Component, effect, Input, input, InputSignal, Signal, signal } from '@angular/core';
import { InferenceDTO, T1PredictionDTO, T1PredictionItem } from '../../../Models/notebook/t1-prediction-model';
import { PercentPipe } from '@angular/common';

@Component({
  selector: 'app-t1-prediction-card',
  imports: [PercentPipe],
  template: `

  @if (_inference()) {
    <section class="mt-6">
      <div class="rounded-xl border-2 border-emerald-400/70 bg-emerald-50/60 dark:bg-gray-900/80 shadow p-6 space-y-4">
        <h3 class="font-bold text-emerald-600 dark:text-emerald-400 text-lg mb-2">Predizione Tossicologica (Mercurion AI T-1)</h3>
          @for (predWrapper of predictions(); track predWrapper) {
            <div class="flex flex-col md:flex-row md:justify-between lg:items-center gap-3 ">
              <div class="flex gap-3">
              @if (predWrapper.prediction.is_positive) {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto text-green-800 dark:text-green-300">
                  <!--!Font Awesome Pro v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM404.4 276.7L324.4 404.7C320.2 411.4 313 415.6 305.1 416C297.2 416.4 289.6 412.8 284.9 406.4L236.9 342.4C228.9 331.8 231.1 316.8 241.7 308.8C252.3 300.8 267.3 303 275.3 313.6L302.3 349.6L363.7 251.3C370.7 240.1 385.5 236.6 396.8 243.7C408.1 250.8 411.5 265.5 404.4 276.8z"/>
                </svg>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto text-light-error dark:text-dark-error">
                  <!--!Font Awesome Pro v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM266.6 216.8L320 282.1L373.4 216.8C381.8 206.5 396.9 205 407.2 213.4C417.5 221.8 419 236.9 410.6 247.2L351 320L410.6 392.8C419 403.1 417.5 418.2 407.2 426.6C396.9 435 381.8 433.5 373.4 423.2L320 357.9L266.6 423.2C258.2 433.5 243.1 435 232.8 426.6C222.5 418.2 221 403.1 229.4 392.8L289 320L229.4 247.2C221 236.9 222.5 221.8 232.8 213.4C243.1 205 258.2 206.5 266.6 216.8z"/>
                </svg>
              }
              <span class="font-semibold">{{ predWrapper.label }}</span>
              <span class="text-sm text-gray-500 ml-2">({{ predWrapper.prediction.probability | percent:'1.0-2' }})</span>
              </div>
              <span class="text-xs md:text-[0.6rem] lg:text-xs italic text-slate-400">Soglia: {{ predWrapper.prediction.threshold }}</span>
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
