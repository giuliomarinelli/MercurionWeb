import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core'
import { DatePipe, NgClass } from '@angular/common'
import { APIClientTicket, Ticket, TicketCardMode } from '../../../Models/graphql/help.models'
import { TypeGuardsService } from '../../../services/type-guards.service'
import { ButtonComponent } from '../../common/button/button.component'

@Component({
  selector: 'm-ticket-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgClass, ButtonComponent],
  template: `
  @if (ticket(); as item) {
    <article class="relative grid min-w-0 grid-cols-1 items-center gap-4 overflow-hidden rounded-2xl border border-token-border bg-surface-elevated p-4 transition-colors hover:border-light-accent-primary-hq/60 focus-within:ring-2 focus-within:ring-light-accent-primary-hq md:grid-cols-[minmax(0,1fr)_auto] md:p-5"
      [class.fade-out]="triggerDisappear()" [class.collapse]="collapse()" [attr.aria-label]="'Ticket ' + readablePublicId()">
      <button type="button" class="absolute inset-0 rounded-2xl outline-none disabled:cursor-wait"
        [disabled]="actionPending()" [class.hidden]="triggerDisappear()"
        [attr.aria-label]="'Apri ticket ' + readablePublicId() + ': ' + item.subject"
        (click)="onOpenDetail.emit(item.id)"></button>
      <div class="pointer-events-none relative min-w-0 md:static">
        <div class="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:pr-36">
          <span class="truncate text-xs font-medium text-on-surface-secondary" [title]="readablePublicId()">#{{ readablePublicId() }}</span>
          <span class="max-w-36 rounded-full border px-2 py-1 text-center text-xs font-semibold md:absolute md:top-10 md:right-5 md:-translate-y-1/2" [ngClass]="statusBadgeClass()">{{ statusLabel() }}</span>
        </div>
        <h2 class="my-2 line-clamp-2 min-h-12 break-words text-base leading-6 font-semibold text-on-surface-main" [title]="item.subject">{{ item.subject }}</h2>
        <div class="space-y-1 text-xs leading-5 text-on-surface-secondary">
          <div class="flex min-h-5 items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="size-3.5 shrink-0 fill-current" aria-hidden="true">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 332.8L306.7 339.9L402.7 403.9L422.7 417.2L449.3 377.3C446.9 375.7 411.8 352.3 344 307.1L344 159.9L296 159.9L296 183.9z"/>
              </svg><span>Aggiornato {{ item.lastMessageAt | date:'dd/MM/yyyy HH:mm' }}</span></div>
          <div class="flex min-h-5 items-center gap-2"><svg
                class="size-3.5 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                >
                <path
                d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z"
                />
                <path d="M3 8h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
              </svg><span>Aperto {{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}</span></div>
          @if (cardMode() === 'support' && typeGuards.isTicket(item)) {
            <p class="m-0 min-h-5 truncate" [title]="getUserFullNameIfIsTicket(item)">Utente: {{ getUserFullNameIfIsTicket(item) }}</p>
          }
        </div>
      </div>
      <div class="relative flex min-h-11 min-w-20 items-center justify-end gap-2">
        @if (showCloseButton()) {
          <m-button variant="outline" [loading]="actionPending()"
            [ariaLabel]="'Chiudi ticket ' + readablePublicId()" (pressed)="close.emit(item.id)">Chiudi</m-button>
        }
        @if (showReopenButton()) {
          <m-button variant="outline" [loading]="actionPending()"
            [ariaLabel]="'Riapri ticket ' + readablePublicId()" (pressed)="reopen.emit(item.id)">Riapri</m-button>
        }
      </div>
      @if (actionError()) {
        <p role="alert" class="relative m-0 text-sm text-red-700 dark:text-red-300 md:col-span-2">{{ actionError() }}</p>
      }
    </article>
  }
  `,
})
export class TicketCardComponent {
  protected readonly typeGuards = inject(TypeGuardsService)
  readonly ticket = input.required<Ticket | APIClientTicket>()
  readonly i = input(0)
  readonly cardMode = input<TicketCardMode>('user')
  readonly triggerDisappear = input(false)
  readonly collapse = input(false)
  readonly allowActions = input(true)
  readonly actionPending = input(false)
  readonly actionError = input('')
  readonly close = output<string>()
  readonly reopen = output<string>()
  readonly onOpenDetail = output<string>()

  readablePublicId = computed(() => {
    const t = this.ticket()
    if (!t) {
      return ''
    }
    const pid = t.publicId ?? ''
    return pid ? String(pid) : String(t.id).slice(0, 8)
  })

  statusLabel = computed(() => {
    const s = this.ticket()?.status
    switch (s) {
      case 'Open': return 'Aperto'
      case 'WaitingSupport': return 'In attesa supporto'
      case 'WaitingUser': return 'In attesa utente'
      case 'Closed': return 'Chiuso'
      default: return String(s ?? '')
    }
  })

  statusBadgeClass = computed(() => {
    const s = this.ticket()?.status
    // palette leggibile anche su dark
    switch (s) {
      case 'Open':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/70 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-700/40'
      case 'WaitingSupport':
        return 'bg-amber-50 text-amber-800 border-amber-200/70 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700/40'
      case 'WaitingUser':
        return 'bg-sky-50 text-sky-800 border-sky-200/70 dark:bg-sky-900/20 dark:text-sky-200 dark:border-sky-700/40'
      case 'Closed':
        return 'bg-slate-200 text-slate-800 border-slate-300/70 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600/60'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200/70 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700/60'
    }
  })

  showCloseButton = computed(() => {
    const t = this.ticket()
    if (!t || !this.allowActions()) {
      return false
    }
    return t.status !== 'Closed'
  })

  showReopenButton = computed(() => {
    const t = this.ticket()
    if (!t || !this.allowActions() || this.cardMode() !== 'support') {
      return false
    }
    return t.status === 'Closed'
  })

  getUserFullNameIfIsTicket(t: Ticket | APIClientTicket | null | undefined): string {
    if (this.typeGuards.isTicket(t)) {
      return t.userFullName ?? ''
    }
    return ''
  }

}
