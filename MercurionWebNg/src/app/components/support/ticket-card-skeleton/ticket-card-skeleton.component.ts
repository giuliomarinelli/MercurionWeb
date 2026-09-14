import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { SkeletonComponent } from '../../common/skeleton/skeleton.component';

@Component({
  selector: 'm-ticket-card-skeleton',
  imports: [NgClass, SkeletonComponent],
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
          'bg-slate-100/50 dark:bg-slate-800/40': i() % 2 !== 0
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
            <m-skeleton shape="rect" width="4rem" height="1.25rem" />
            <m-skeleton shape="rect" width="5rem" height="1.25rem" />
          </div>

          <!-- subject -->
          <m-skeleton class="mt-2" width="75%" height="1.75rem" />

          <!-- meta line -->
          <div class="mt-2 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-1 sm:gap-2">
            <m-skeleton width="10rem" height=".75rem" />
            <m-skeleton width=".5rem" height=".75rem" />
            <m-skeleton width="7rem" height=".75rem" />
          </div>

          <!-- optional extra line for support -->
          <m-skeleton class="mt-1" width="13rem" height=".75rem" />
        </div>

        <!-- COLONNA DESTRA -->
        <div class="md:col-span-3 flex md:justify-end items-center gap-2 relative z-30">
          <m-skeleton shape="rect" width="4rem" height="1.75rem" />
          <m-skeleton shape="rect" width="4rem" height="1.75rem" />
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

  readonly i = input(0)

}
