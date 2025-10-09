import { Component, Input, signal } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';

@Component({
  selector: 'app-skeleton-collection-card',
  standalone: true,
  imports: [NgClass, NgStyle],
  template: `
    <div
      class="
        group focus-visible:outline-none
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
      <!-- Colonna sinistra: 8/12 -->
      <div class="md:col-span-8 flex items-start gap-3 min-w-0">
        <!-- Avatar placeholder -->
        <div
          class="hidden sm:block size-9 shrink-0 rounded-xl border
                 border-slate-200/70 dark:border-slate-700/60
                 bg-slate-200/70 dark:bg-slate-700/60">
        </div>

        <div class="min-w-0 w-full">
          <!-- Titolo placeholder -->
          <div class="h-5 w-2/3 rounded-md
                      bg-slate-200/80 dark:bg-slate-700/70"></div>

          <!-- Meta (mobile) -->
          <div class="mt-2 flex md:hidden items-center gap-2">
            <div class="h-3 w-24 rounded bg-slate-200/70 dark:bg-slate-700/60"></div>
            <span class="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <div class="h-3 w-20 rounded bg-slate-200/70 dark:bg-slate-700/60"></div>
          </div>
        </div>
      </div>

      <!-- Colonna destra: 4/12 -->
      <div class="md:col-span-4 flex md:justify-end items-center gap-3 md:gap-4">
        <div class="h-6 w-28 rounded-full border
                    border-slate-200/70 dark:border-slate-700/60
                    bg-slate-100 dark:bg-slate-800/60"></div>

        <div class="hidden md:block h-4 w-4 rounded bg-slate-200/70 dark:bg-slate-700/60"></div>
      </div>

      <!-- Footer meta: full width -->
      <div class="md:col-span-12 mt-1 md:mt-0 flex items-center gap-3">
        <div class="h-3 w-36 rounded bg-slate-200/70 dark:bg-slate-700/60"></div>
        <span class="size-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
        <div class="h-3 w-32 rounded bg-slate-200/70 dark:bg-slate-700/60"></div>
      </div>

      <span class="sr-only">Caricamento collezione…</span>
    </div>
  `
})
export class SkeletonCollectionCardComponent {
  private _index = signal(0);
  _height = signal<string>('auto');

  @Input()
  set i(value: number) { this._index.set(value ?? 0); }
  _i = this._index;

  @Input()
  set height(value: string) {
    this._height.set(value || 'auto');
  }
}
