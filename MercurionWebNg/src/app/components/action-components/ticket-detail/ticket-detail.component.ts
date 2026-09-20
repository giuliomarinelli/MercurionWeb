import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { TicketComposerComponent } from '../../support/ticket-composer/ticket-composer.component';
import { IconButtonComponent } from '../../common/icon-button/icon-button.component';
import { TicketDetailFacade, TicketMessageDraft } from './ticket-detail.facade';
import { TicketThreadComponent } from './ticket-thread.component';
import { TicketToolbarComponent } from './ticket-toolbar.component';

@Component({
  selector: 'm-ticket-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TicketDetailFacade],
  imports: [DatePipe, NgClass, TicketComposerComponent, IconButtonComponent, TicketThreadComponent, TicketToolbarComponent],
  styles: [`
    :host { display: block; width: 100%; }
    :host ::ng-deep .ql-toolbar.ql-snow,
    :host ::ng-deep .ql-container.ql-snow { border: 1px solid rgb(203 213 225 / .7); border-radius: .75rem; background: white; }
    :host-context(.dark) ::ng-deep .ql-toolbar.ql-snow,
    :host-context(.dark) ::ng-deep .ql-container.ql-snow { border-color: rgb(51 65 85 / .8); background: #1f2937; }
    :host ::ng-deep .ql-editor { min-height: 110px; font-size: .95rem; }
  `],
  template: `
    <div class="flex justify-center items-start md:items-center min-h-screen px-2 pt-1 md:pt-6 m-overlay-screen">
      <div class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg overflow-y-auto custom-scrollbar m-scroll-thin m-overlay-max-80 m-overscroll-touch h-full md:h-auto"
           role="region" aria-labelledby="ticketDetailHeading" [attr.aria-busy]="state().kind === 'loading'">
        <header class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main">
          <h2 id="ticketDetailHeading" class="text-lg font-semibold">Dettaglio Ticket&nbsp;
            @if (content(); as ticketContent) { <span class="text-light-accent-secondary">#{{ ticketContent.ticket.publicId }}</span> }
          </h2>
          <m-icon-button size="sm" icon="close" ariaLabel="Chiudi dettaglio ticket" (pressed)="close()" />
        </header>
        @switch (state().kind) {
          @case ('loading') { <p class="p-8 text-center" role="status">Caricamento ticket…</p> }
          @case ('error') {
            <div class="p-8 text-center" role="alert"><p>{{ errorMessage() }}</p>
              <button type="button" class="underline mt-2" (click)="facade.reload()">Riprova</button>
            </div>
          }
          @case ('content') {
            @if (content(); as ticketContent) {
            <section class="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-medium px-2 py-0.5 rounded-full">#{{ ticketContent.ticket.publicId }}</span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full border" [ngClass]="statusBadgeClass()">{{ statusLabel() }}</span>
                @if (ticketContent.capabilities.showRequester && requesterName()) { <span class="text-xs">Utente: <b>{{ requesterName() }}</b></span> }
              </div>
              <div class="text-base md:text-lg font-semibold">{{ ticketContent.ticket.subject }}</div>
              <div class="flex flex-wrap gap-3 text-xs">
                <span>Creato: {{ ticketContent.ticket.createdAt | date: 'dd/MM/yyyy HH:mm' }}</span>
                <span>Aggiornato: {{ ticketContent.ticket.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</span>
                <span>Ultimo msg: {{ ticketContent.ticket.lastMessageAt | date: 'dd/MM/yyyy HH:mm:ss' }}</span>
              </div>
              <m-ticket-toolbar [capabilities]="ticketContent.capabilities" [pending]="ticketContent.commandPending"
                (closeTicket)="facade.closeTicket()" (reopenTicket)="facade.reopenTicket()" />
            </section>
            <m-ticket-thread [messages]="ticketContent.messages" [scope]="ticketContent.scope"
              [pagePending]="ticketContent.thread.pending" [pageError]="ticketContent.thread.error"
              (loadMore)="facade.loadMore()" (retry)="facade.retryPage()" />
            <div class="border-t border-slate-200/70 dark:border-slate-700/60">
              @if (ticketContent.capabilities.canSend) {
                <m-ticket-composer [pending]="ticketContent.composer.kind === 'pending'" [error]="composerError()"
                  (send)="send($event)" (retry)="facade.retrySubmit()" (cancel)="facade.cancelSubmit()" />
              } @else { <p class="text-center text-xs py-8">Il ticket è chiuso, non è possibile inviare messaggi.</p> }
            </div>
            }
          }
        }
      </div>
    </div>
  `,
})
export class TicketDetailComponent implements OnDestroy {
  protected readonly facade = inject(TicketDetailFacade);
  private readonly overlay = inject(ActionOverlayContextService);
  private readonly sessionId = this.overlay.session('TicketDetail')?.id ?? -1;
  protected readonly state = this.facade.state;
  protected readonly content = computed(() => { const state = this.state(); return state.kind === 'content' ? state : null; });
  protected readonly errorMessage = computed(() => { const state = this.state(); return state.kind === 'error' ? state.message : ''; });
  protected readonly composerError = computed(() => { const value = this.content()?.composer; return value?.kind === 'error' ? value.message : null; });
  protected readonly requesterName = computed(() => {
    const ticket = this.content()?.ticket;
    return ticket && 'userFullName' in ticket ? ticket.userFullName ?? '' : '';
  });
  protected readonly statusLabel = computed(() => {
    switch (this.content()?.ticket.status) {
      case 'Open': return 'Aperto';
      case 'WaitingSupport': return 'In attesa supporto';
      case 'WaitingUser': return 'In attesa utente';
      case 'Closed': return 'Chiuso';
      default: return '';
    }
  });
  protected readonly statusBadgeClass = computed(() => {
    switch (this.content()?.ticket.status) {
      case 'Open': return 'bg-emerald-50 text-emerald-800 border-emerald-200/70';
      case 'WaitingSupport': return 'bg-amber-50 text-amber-800 border-amber-200/70';
      case 'WaitingUser': return 'bg-sky-50 text-sky-800 border-sky-200/70';
      case 'Closed': return 'bg-slate-200 text-slate-800 border-slate-300/70';
      default: return '';
    }
  });

  protected close(): void { queueMicrotask(() => this.overlay.close(this.sessionId)); }
  protected send(draft: TicketMessageDraft): void { this.facade.submit(draft); }
  ngOnDestroy(): void { this.facade.destroy(); }
}
