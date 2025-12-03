import { Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { TicketDetailContextService } from '../../../services/context/action-context/ticket-detail-context.service';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { ClientTicket, ClientTicketMessage, Ticket, TicketMessage } from '../../../Models/graphql/help.models';
import { AbstractPaginationComponent } from '../../../abstract/abstract-pagination-component';
import { Observable, of, switchMap } from 'rxjs';
import { PageModel } from '../../../Models/graphql/page.models';
import { HelpService } from '../../../services/graphql/help.service';
import { TypeGuardsService } from '../../../services/type-guards.service';

@Component({
  selector: 'm-ticket-detail',
  imports: [],
  template: `

<div class="flex justify-center items-center min-h-screen px-2">
  <div class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg">
    <div class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main">
      <!-- header sticky -->
      <h2 class="text-lg font-semibold">Collega molecola a nuove collezioni</h2>
      <button class="inline-flex items-center justify-center size-8 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-transparent transition" (click)="close()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"/>
        </svg>
      </button>
    </div>
    <div #scrollRoot class="py-6 px-3 overflow-y-auto flex flex-col gap-4 min-h-[60vh] max-h-[60vh]">
      <div #sentinel class="w-full h-px"></div>
      <!-- body scrollabile: qui ci vanno i messaggi in stile chat -->
    </div>
    <div class="my-4 mr-8 flex justify-end gap-2">
      <!-- footer esterno allo scroll -->
    </div>
  </div>
</div>


 `
})
export class TicketDetailComponent extends AbstractPaginationComponent<TicketMessage | ClientTicketMessage> implements OnInit, OnDestroy {

  private readonly detailContext = inject(TicketDetailContextService)
  private readonly overlayContext = inject(ActionOverlayContextService)
  private readonly helpService = inject(HelpService)
  private readonly typeGuards = inject(TypeGuardsService)

  private readonly ITEMS_PER_PAGE = 10

  @ViewChild('sentinel')
  protected declare sentinel: ElementRef<HTMLDivElement>

  @ViewChild('scrollRoot')
  protected declare root: ElementRef<HTMLDivElement>

  ticket = signal<Ticket | ClientTicket | null>(null)

  ngOnInit(): void {

  }

  ngOnDestroy(): void {

  }

  close(): void {
    queueMicrotask(() => {
      this.overlayContext.close()
      this.detailContext.clearTicketId()
    })

  }

  protected override fetch$(): Observable<PageModel<TicketMessage | ClientTicketMessage>> {
    return of(null).pipe(
      switchMap(() => {
        if (this.page === 1 && !this.ticket) {
          if (this.detailContext.innerScope() === 'User') {
            return this.helpService.myTicketDetail(this.detailContext.ticketId())
          } else if (this.detailContext.innerScope() === 'Support') {
            return this.helpService.ticketDetailAsSupport(this.detailContext.ticketId())
          }
        }
        return of(null)
      }),
      switchMap((t: ClientTicket | Ticket | null) => {
        if (t) {
          this.ticket.set(t)
        }
        const default$ = this.helpService.myTicketMessages(this.page, this.ITEMS_PER_PAGE, this.detailContext.ticketId())
        if (this.detailContext.innerScope() === 'User') {
          return default$
        } else if (this.detailContext.innerScope() === 'Support') {
          return this.helpService.ticketMessagesAsSupport(this.page, this.ITEMS_PER_PAGE, this.detailContext.ticketId())
        }
        return default$
      })
    )
  }

  protected override doQuery(q: string): void {
    // Per adesso non usiamo la ricerca
  }
  protected override doClear(): void {
    // Per adesso non usiamo la ricerca
  }

}
