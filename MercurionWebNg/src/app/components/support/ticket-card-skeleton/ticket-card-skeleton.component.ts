import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { SkeletonComponent } from '../../common/skeleton/skeleton.component'

@Component({
  selector: 'm-ticket-card-skeleton',
  imports: [SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative grid min-w-0 grid-cols-1 items-center gap-4 overflow-hidden rounded-2xl border border-token-border bg-surface-elevated p-4 md:grid-cols-[minmax(0,1fr)_auto] md:p-5"
      role="status" aria-label="Caricamento ticket" aria-busy="true">
      <div class="min-w-0" aria-hidden="true">
        <div class="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:pr-36">
          <m-skeleton width="7rem" height="1rem" />
          <m-skeleton class="md:absolute md:top-10 md:right-5 md:-translate-y-1/2" width="7rem" height="1.75rem" />
        </div>
        <div class="my-2 flex min-h-12 items-start pt-1"><m-skeleton width="85%" height="1.25rem" /></div>
        <div class="space-y-1">
          <div class="flex min-h-5 items-center"><m-skeleton width="min(100%, 14rem)" height=".75rem" /></div>
          <div class="flex min-h-5 items-center"><m-skeleton width="min(100%, 13rem)" height=".75rem" /></div>
          @if (support()) {
            <div class="flex min-h-5 items-center"><m-skeleton width="70%" height=".75rem" /></div>
          }
        </div>
      </div>
      <div class="flex min-h-11 min-w-20 items-center justify-end" aria-hidden="true"><m-skeleton width="5rem" height="2.75rem" /></div>
    </div>
  `,
})
export class TicketCardSkeletonComponent {
  readonly i = input(0)
  readonly support = input(false)
}
