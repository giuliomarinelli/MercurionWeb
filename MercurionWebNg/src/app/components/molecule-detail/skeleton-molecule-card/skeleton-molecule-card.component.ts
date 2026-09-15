import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { SkeletonComponent } from '../../common/skeleton/skeleton.component';

@Component({
  selector: 'm-skeleton-molecule-card',
  imports: [NgClass, NgStyle, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="
        grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4
        rounded-2xl border p-4 md:p-5
        bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm
        border-slate-200/70 dark:border-slate-700/60
        transition-all duration-200
        animate-pulse
      "
      [ngClass]="{
        'bg-slate-50/60 dark:bg-slate-800/40': _i() % 2 !== 0
      }"
      [ngStyle]="{ height: _height() }"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Caricamento dati molecola"
    >
      <!-- Colonna sinistra: 8/12 - testo -->
      <div class="md:col-span-8 min-w-0">
        <m-skeleton width="66.666667%" height="1.25rem" />
        <m-skeleton class="mt-2" width="33.333333%" height="1rem" />

        <div class="mt-3 flex items-center gap-2">
          <m-skeleton shape="rect" width="6rem" height="1.25rem" />
          <m-skeleton shape="rect" width="5rem" height="1.25rem" />
        </div>
      </div>

      <!-- Colonna destra: 4/12 - viewer -->
      <div class="md:col-span-4 flex md:justify-end items-center">
        <m-skeleton shape="rect" width="7rem" height="7rem" />
      </div>

      <span class="sr-only">Caricamento molecola…</span>
    </div>
  `
})
export class SkeletonMoleculeCardComponent {
  private _index = signal(0);
  private _heightSig = signal<string>('auto');

  readonly i = input(0)
  private readonly syncIndex = effect(() => this._index.set(this.i()))
  _i = this._index;

  /** E.g. "180px", "12rem", "20vh", ecc. */
  readonly height = input<string | null>('auto')
  private readonly syncHeight = effect(() => this._heightSig.set(this.height() || 'auto'))
  _height = this._heightSig;
}
