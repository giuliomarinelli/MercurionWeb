import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'm-skeleton-collection-card',
  imports: [NgClass, NgStyle, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="
        group focus-visible:outline-none
        grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4
        border p-4 md:p-5
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
        <m-skeleton class="hidden sm:block shrink-0" shape="rect" width="2.25rem" height="2.25rem" />

        <div class="min-w-0 w-full">
          <!-- Titolo placeholder -->
          <m-skeleton width="66.666667%" height="1.25rem" />

          <!-- Meta (mobile) -->
          <div class="mt-2 flex md:hidden items-center gap-2">
            <m-skeleton width="6rem" height=".75rem" />
            <span class="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <m-skeleton width="5rem" height=".75rem" />
          </div>
        </div>
      </div>

      <!-- Colonna destra: 4/12 -->
      <div class="md:col-span-4 flex md:justify-end items-center gap-3 md:gap-4">
        <m-skeleton shape="rect" width="7rem" height="1.5rem" />

        <m-skeleton class="hidden md:block" width="1rem" height="1rem" />
      </div>

      <!-- Footer: meta + (azioni placeholder se non readonly) -->
      <div class="md:col-span-12 mt-1 md:mt-0 flex items-center justify-between">
        <!-- Meta left -->
        <div class="flex items-center gap-3">
          <m-skeleton width="9rem" height=".75rem" />
          <span class="size-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
          <m-skeleton width="8rem" height=".75rem" />
        </div>

        <!-- Azioni right (solo se !readonly) -->
        @if (!_isReadonly()) {
          <div class="flex items-center gap-3">
            <!-- Duplica (icona) -->
            <m-skeleton shape="rect" width="1.75rem" height="1.75rem" />

            <!-- Elimina (icona) -->
            <m-skeleton shape="rect" width="1.75rem" height="1.75rem" />

            <!-- Aggiungi molecole (pill) -->
            <m-skeleton shape="rect" width="7rem" height="1.75rem" />
          </div>
        }
      </div>

      <span class="sr-only">Caricamento collezione…</span>
    </div>
  `
})
export class SkeletonCollectionCardComponent {
  private _index = signal(0);
  _i = this._index;

  _height = signal<string>('auto');
  _isReadonly = signal<boolean>(false);

  readonly i = input(0)
  readonly height = input('auto')
  readonly isReadonly = input(false)
  private readonly syncInputs = effect(() => {
    this._index.set(this.i())
    this._height.set(this.height() || 'auto')
    this._isReadonly.set(this.isReadonly())
  })
}
