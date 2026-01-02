import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'm-ticket-card-skeleton',
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <div
        class="
          relative
          grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4
          rounded-2xl border p-4 md:p-5
          bg-slate-100 dark:bg-slate-800/50 backdrop-blur-sm
          border-slate-200/70 dark:border-slate-700/60
          overflow-hidden
        "
        [ngClass]="{
          'bg-slate-100/50 dark:bg-slate-800/40': _i() % 2 !== 0
        }"
        role="status"
        aria-busy="true"
        aria-label="Caricamento ticket"
      >
        <!-- shimmer overlay -->
        <div class="absolute inset-0 -translate-x-full animate-[shimmer_1.2s_infinite]
                    bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent">
        </div>

        <!-- COLONNA SINISTRA -->
        <div class="md:col-span-9 min-w-0 relative z-20">
          <!-- publicId + badge -->
          <div class="flex items-center gap-3">
            <div class="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            <div class="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-700"></div>
          </div>

          <!-- subject -->
          <div class="mt-2 h-6 md:h-7 w-3/4 rounded-md bg-slate-200 dark:bg-slate-700"></div>

          <!-- meta line -->
          <div class="mt-2 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-1 sm:gap-2">
            <div class="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700"></div>
            <div class="h-3 w-2 rounded bg-slate-200 dark:bg-slate-700"></div>
            <div class="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700"></div>
          </div>

          <!-- optional extra line for support -->
          <div class="mt-1 h-3 w-52 rounded bg-slate-200 dark:bg-slate-700"></div>
        </div>

        <!-- COLONNA DESTRA -->
        <div class="md:col-span-3 flex md:justify-end items-center gap-2 relative z-30">
          <div class="h-7 w-16 rounded-md bg-slate-200 dark:bg-slate-700"></div>
          <div class="h-7 w-16 rounded-md bg-slate-200 dark:bg-slate-700"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }
  `]
})
export class TicketCardSkeletonComponent {

  _i = signal(0)

  @Input()
  set i(v: number) {
    this._i.set(v ?? 0)
  }

}
