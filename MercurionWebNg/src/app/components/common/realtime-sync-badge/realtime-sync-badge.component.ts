import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RealtimeSyncStatusService } from '../../../services/realtime-sync-status.service'

@Component({
  selector: 'm-realtime-sync-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status.visible()) {
      <span
        class="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-800 shadow-sm dark:border-emerald-300/20 dark:bg-emerald-950/70 dark:text-emerald-200"
        role="status"
        aria-live="polite">
        <span aria-hidden="true">↻</span>
        Sincronizzato
      </span>
    }
  `
})
export class RealtimeSyncBadgeComponent {
  protected readonly status = inject(RealtimeSyncStatusService)
}
