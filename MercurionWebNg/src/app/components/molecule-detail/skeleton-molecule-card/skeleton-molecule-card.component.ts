import { Component, Input, signal } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';

@Component({
  selector: 'm-skeleton-molecule-card',
  standalone: true,
  imports: [NgClass, NgStyle],
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
    >
      <!-- Colonna sinistra: 8/12 - testo -->
      <div class="md:col-span-8 min-w-0">
        <div class="h-5 w-2/3 rounded-md bg-slate-200/80 dark:bg-slate-700/70"></div>
        <div class="mt-2 h-4 w-1/3 rounded bg-slate-200/70 dark:bg-slate-700/60"></div>

        <div class="mt-3 flex items-center gap-2">
          <div class="h-5 w-24 rounded-full bg-slate-200/70 dark:bg-slate-700/60"></div>
          <div class="h-5 w-20 rounded-full bg-amber-100/60 dark:bg-amber-900/20"></div>
        </div>
      </div>

      <!-- Colonna destra: 4/12 - viewer -->
      <div class="md:col-span-4 flex md:justify-end items-center">
        <div class="size-24 md:size-28 rounded-xl border
                    border-slate-200/70 dark:border-slate-700/60
                    bg-slate-200/80 dark:bg-slate-700/70"></div>
      </div>

      <span class="sr-only">Caricamento molecola…</span>
    </div>
  `
})
export class SkeletonMoleculeCardComponent {
  private _index = signal(0);
  private _heightSig = signal<string>('auto');

  @Input()
  set i(value: number) { this._index.set(value ?? 0); }
  _i = this._index;

  /** E.g. "180px", "12rem", "20vh", ecc. */
  @Input()
  set height(value: string | null) {
    this._heightSig.set(value || 'auto');
  }
  _height = this._heightSig;
}
