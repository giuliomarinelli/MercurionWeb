import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy } from '@angular/core'
import { DatePipe, NgClass } from '@angular/common'
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service'
import { TicketComposerComponent } from '../../support/ticket-composer/ticket-composer.component'
import { ActionCardComponent } from '../../common/action-card/action-card.component'
import { ButtonComponent } from '../../common/button/button.component'
import { ProgressIndicatorComponent } from '../../common/progress-indicator/progress-indicator.component'
import { TicketDetailFacade } from './ticket-detail.facade'
import { TicketThreadComponent } from './ticket-thread.component'
import { TicketToolbarComponent } from './ticket-toolbar.component'

@Component({
  selector: 'm-ticket-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TicketDetailFacade],
  imports: [DatePipe, NgClass, TicketComposerComponent, ActionCardComponent, ButtonComponent,
    ProgressIndicatorComponent, TicketThreadComponent, TicketToolbarComponent],
  template: `
    <div class="m-overlay-screen flex items-start justify-center px-2 sm:px-4 md:items-center">
      <div class="w-full max-w-5xl">
        <m-action-card size="wide" labelledBy="ticketDetailHeading" closeLabel="Chiudi dettaglio ticket"
          [closeDisabled]="busy()" [busy]="state().kind === 'loading'" (closed)="close()">
          <h2 action-card-title id="ticketDetailHeading" class="text-lg font-semibold [overflow-wrap:anywhere]">
            Dettaglio ticket
            @if (content(); as value) {
              <span class="text-accent-secondary">#{{ value.ticket.publicId }}</span>
            }
          </h2>
          <div action-card-body class="min-w-0">
            @switch (state().kind) {
              @case ('loading') {
                <div class="flex min-h-64 items-center justify-center p-6">
                  <m-progress-indicator label="Caricamento ticket…" />
                </div>
              }
              @case ('error') {
                <div class="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center">
                  <p role="alert">{{ errorMessage() }}</p>
                  <m-button variant="outline" (pressed)="facade.reload()">Riprova</m-button>
                </div>
              }
              @case ('content') {
                @if (content(); as value) {
                  <section class="flex min-w-0 flex-col gap-3 border-b border-token-border bg-surface-main p-3 sm:p-6" aria-label="Informazioni ticket">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <span class="rounded-full border px-3 py-1 text-xs font-semibold" [ngClass]="statusBadgeClass()">{{ statusLabel() }}</span>
                      <m-ticket-toolbar [capabilities]="value.capabilities" [pending]="value.commandPending"
                        [disabled]="value.composer.kind === 'pending' || value.refreshing"
                        (closeTicket)="facade.closeTicket()" (reopenTicket)="facade.reopenTicket()" />
                    </div>
                    <h3 class="text-base font-semibold [overflow-wrap:anywhere] sm:text-lg">{{ value.ticket.subject }}</h3>
                    @if (value.capabilities.showRequester && requesterName()) {
                      <p class="text-sm [overflow-wrap:anywhere]">Utente: <b>{{ requesterName() }}</b></p>
                    }
                    <dl class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-on-surface-secondary">
                      <div><dt class="inline">Aperto: </dt><dd class="inline">{{ value.ticket.createdAt | date: 'dd/MM/yyyy HH:mm' }}</dd></div>
                      <div><dt class="inline">Aggiornato: </dt><dd class="inline">{{ value.ticket.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</dd></div>
                      <div><dt class="inline">Ultimo messaggio: </dt><dd class="inline">{{ value.ticket.lastMessageAt | date: 'dd/MM/yyyy HH:mm' }}</dd></div>
                    </dl>
                    @if (value.commandError) {
                      <p role="alert" class="text-sm text-red-700 dark:text-red-300">{{ value.commandError }}</p>
                    }
                    <div class="flex flex-wrap items-center gap-3 text-sm">
                      <m-button variant="ghost" [loading]="value.refreshing" [disabled]="busy()" (pressed)="facade.refresh()">Aggiorna conversazione</m-button>
                      @if (value.refreshError) {
                        <p role="alert" class="text-red-700 dark:text-red-300">{{ value.refreshError }}</p>
                      }
                    </div>
                  </section>
                  <m-ticket-thread [messages]="value.messages" [scope]="value.scope"
                    [pagePending]="value.thread.pending" [pageError]="value.thread.error" [done]="value.thread.done"
                    [refreshing]="value.refreshing" [sentRevision]="value.sentRevision"
                    (loadMore)="facade.loadMore()" (retry)="facade.retryPage()" />
                  <m-ticket-composer [pending]="value.composer.kind === 'pending'" [error]="composerError()"
                    [disabled]="!value.capabilities.canSend || value.commandPending"
                    [closed]="!value.capabilities.canSend" [sentRevision]="value.sentRevision"
                    (send)="facade.submit($event)" />
                }
              }
            }
          </div>
        </m-action-card>
      </div>
    </div>
  `,
})
export class TicketDetailComponent implements OnDestroy {
  protected readonly facade = inject(TicketDetailFacade)
  private readonly overlay = inject(ActionOverlayContextService)
  private readonly sessionId = this.overlay.session('TicketDetail')?.id ?? -1
  protected readonly state = this.facade.state
  protected readonly content = computed(() => {
    const state = this.state()
    return state.kind === 'content' ? state : null
  })
  protected readonly busy = computed(() => {
    const value = this.content()
    return !!value && (value.commandPending || value.composer.kind === 'pending')
  })
  protected readonly errorMessage = computed(() => {
    const state = this.state()
    return state.kind === 'error' ? state.message : ''
  })
  protected readonly composerError = computed(() => {
    const value = this.content()?.composer
    return value?.kind === 'error' ? value.message : null
  })
  protected readonly requesterName = computed(() => {
    const ticket = this.content()?.ticket
    return ticket && 'userFullName' in ticket ? ticket.userFullName ?? '' : ''
  })
  protected readonly statusLabel = computed(() => {
    switch (this.content()?.ticket.status) {
      case 'Open': return 'Aperto'
      case 'WaitingSupport': return 'In attesa supporto'
      case 'WaitingUser': return 'In attesa utente'
      case 'Closed': return 'Chiuso'
      default: return ''
    }
  })
  protected readonly statusBadgeClass = computed(() => {
    switch (this.content()?.ticket.status) {
      case 'Open': return 'bg-emerald-50 text-emerald-800 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700'
      case 'WaitingSupport': return 'bg-amber-50 text-amber-800 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700'
      case 'WaitingUser': return 'bg-sky-50 text-sky-800 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-700'
      case 'Closed': return 'bg-slate-200 text-slate-800 border-slate-300/70 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600'
      default: return ''
    }
  })

  constructor() {
    effect(() => {
      const busy = this.busy()
      if (this.overlay.session('TicketDetail')?.id !== this.sessionId) return
      const phase = this.overlay.state().phase
      if (busy && (phase === 'active' || phase === 'failed' || phase === 'succeeded')) {
        this.overlay.beginSubmit(this.sessionId)
      } else if (!busy && phase === 'submitting') {
        if (this.composerError() || this.content()?.commandError) this.overlay.submitFailed(this.sessionId)
        else this.overlay.submitSucceeded(this.sessionId)
      }
    })
  }

  protected close(): void {
    if (!this.busy()) this.overlay.close(this.sessionId)
  }

  ngOnDestroy(): void {
    this.facade.destroy()
  }
}
