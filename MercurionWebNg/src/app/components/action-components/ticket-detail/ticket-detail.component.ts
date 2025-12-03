import { AfterViewInit, ChangeDetectorRef, Component, computed, effect, ElementRef, inject, NgZone, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { TicketDetailContextService } from '../../../services/context/action-context/ticket-detail-context.service';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { ClientTicket, ClientTicketMessage, Ticket, TicketMessage } from '../../../Models/graphql/help.models';
import { AbstractPaginationComponent } from '../../../abstract/abstract-pagination-component';
import { catchError, filter, firstValueFrom, Observable, of, switchMap, tap } from 'rxjs';
import { PageModel } from '../../../Models/graphql/page.models';
import { HelpService } from '../../../services/graphql/help.service';
import { TypeGuardsService } from '../../../services/type-guards.service';
import { MessageItemComponent } from '../message-item/message-item.component';
import { TicketDetailInnerScope } from '../../../Models/action/action-overlay.models';
import { DatePipe, NgClass } from '@angular/common';
import { Maybe } from 'graphql/jsutils/Maybe';
import { TicketComposerComponent } from '../../support/ticket-composer/ticket-composer.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'm-ticket-detail',
  imports: [
    MessageItemComponent,
    DatePipe,
    NgClass,
    TicketComposerComponent
  ],
  template: `

<div class="flex justify-center items-center min-h-screen px-2">
  <div class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg">
    <div class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main">
      <!-- header sticky -->
      <h2 class="text-lg font-semibold">Dettaglio Ticket&nbsp;
        <span class="font-semibold text-light-accent-secondary dark:text-dark-accent-secondary" [innerText]="ticket()?.publicId ? '#' + ticket()?.publicId : ''">
        </span>
      </h2>
      <button class="inline-flex items-center justify-center size-8 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-transparent transition" (click)="close()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-5 h-auto">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"/>
        </svg>
      </button>
    </div>
    <!-- INFO TICKET (non scrollabile) -->
    @if (ticket()) {
      <div class="
          px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/60
          bg-slate-50/70 dark:bg-slate-800/40
          flex flex-col gap-2
        ">

        <div class="flex flex-wrap items-center gap-2">
          <span class="
              text-xs font-medium
              text-slate-700 dark:text-slate-200
              bg-slate-200/70 dark:bg-slate-700/60
              border border-slate-300/60 dark:border-slate-600/60
              px-2 py-0.5 rounded-full">
            #{{ ticket()!.publicId }}
          </span>

          <span class="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 border"
                [ngClass]="statusBadgeClass()">
            {{ statusLabel() }}
          </span>

          @if (innerScope() === 'Support' && typeGuards.isTicket(ticket())) {
            <span class="text-xs text-slate-600 dark:text-slate-300">
              Utente: <span class="font-medium">{{ getUserFullNameFromTicket() }}</span>
            </span>
          }
        </div>

        <div class="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-50">
          {{ ticket()!.subject }}
        </div>

        <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Creato: {{ ticket()!.createdAt | date:'medium' }}</span>
          <span class="text-slate-300 dark:text-slate-600">•</span>
          <span>Aggiornato: {{ ticket()!.updatedAt | date:'medium' }}</span>
          <span class="text-slate-300 dark:text-slate-600">•</span>
          <span>Ultimo msg: {{ ticket()!.lastMessageAt | date:'medium' }}</span>
        </div>
      </div>
    }

    <div #scrollRoot class="py-6 px-3 overflow-y-auto flex flex-col gap-4 min-h-[30vh] max-h-[40vh]">
      <div #sentinel class="w-full h-px"></div>
      <!-- body scrollabile: qui ci vanno i messaggi in stile chat -->
      @for (item of items; track item.id; let i = $index) {
        @if (typeGuards.isTicketMessage(item)) {
          <m-message-item
            [message]="item"
            [selfAuthorType]="innerScope()"
            [showAuthor]="true" />
        } @else {
          <m-message-item
            [message]="item"
            [selfAuthorType]="innerScope()" />
        }
      }
    </div>
    <div class="my-4 px-3 sm:px-4 w-full">
      <m-ticket-composer class="block w-full" (send)="onSend($event)" />
    </div>
  </div>
</div>


 `
})
export class TicketDetailComponent extends AbstractPaginationComponent<TicketMessage | ClientTicketMessage> implements OnInit, OnDestroy, AfterViewInit {

  private readonly detailContext = inject(TicketDetailContextService)
  private readonly overlayContext = inject(ActionOverlayContextService)
  private readonly helpService = inject(HelpService)
  protected readonly typeGuards = inject(TypeGuardsService)
  private readonly cdr = inject(ChangeDetectorRef)

  private composerSub?: Subscription

  private readonly ITEMS_PER_PAGE = 10

  @ViewChild('sentinel')
  protected declare sentinel: ElementRef<HTMLDivElement>

  @ViewChild('scrollRoot')
  protected declare root: ElementRef<HTMLDivElement>

  ticket = signal<Ticket | ClientTicket | null>(null)
  innerScope = signal<TicketDetailInnerScope>('User')
  watchableInnerScope = signal<boolean>(false)

  constructor() {
    super()
    effect(() => {
      const w = this.watchableInnerScope()
      if (!w) {
        return
      }
      const is = this.detailContext.innerScope()
      if (is !== this.innerScope()) {
        this.innerScope.set(is)
      }
    })
    effect(() => {
      const id = this.detailContext.ticketId()
      if (!id) {
        return
      }
      this.resetPagination()
      this.items = []
      this.ticket.set(null)
      this.done = false
      this.earlyDone = false
      this.loading = false
      this.empty.set(true)
      queueMicrotask(() => this.loadMore())
    })
  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {
    this.composerSub?.unsubscribe()
    this.observer?.disconnect()
  }

  ngAfterViewInit(): void {
    this.startObserver()
  }

  close(): void {
    queueMicrotask(() => {
      this.overlayContext.close()
      this.detailContext.resetInnerScope()
      this.detailContext.clearTicketId()
    })
  }

  protected override fetch$(): Observable<PageModel<TicketMessage | ClientTicketMessage>> {
    return of(null).pipe(
      switchMap(() => {
        if (this.page === 1 && !this.ticket()) {
          this.innerScope.set(this.detailContext.innerScope())
          if (this.innerScope() === 'User') {
            return this.helpService.myTicketDetail(this.detailContext.ticketId())
          } else if (this.innerScope() === 'Support') {
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
      }),
      filter((val) => !!val),
      tap(() => this.watchableInnerScope.set(true))
    )
  }

  protected override async loadMore(): Promise<void> {

    if (this.loading || this.done) {
      return
    }

    this.loading = true

    const rootEl = this.root?.nativeElement
    const prevHeight = rootEl?.scrollHeight ?? 0
    const prevTop = rootEl?.scrollTop ?? 0

    const newPage = await firstValueFrom(this.fetch$())

    if (newPage.items.length === 0) {
      this.done = true
      if (this.page === 1) this.earlyDone = true
    } else {
      if (this.empty()) this.empty.set(false)
      const chunk = [...newPage.items].reverse()
      this.items = [...chunk, ...this.items]
      this.page++
    }

    this.loading = false

    this.cdr.markForCheck()

    queueMicrotask(() => {
      if (!rootEl) {
        return
      }
      const newHeight = rootEl.scrollHeight
      const delta = newHeight - prevHeight
      rootEl.scrollTop = prevTop + delta
      this.cdr.markForCheck()
    })
  }

  statusLabel = computed(() => {
    const s = this.ticket()?.status;
    switch (s) {
      case 'Open': return 'Aperto'
      case 'WaitingSupport': return 'In attesa supporto'
      case 'WaitingUser': return 'In attesa utente'
      case 'Closed': return 'Chiuso'
      default: return String(s ?? '')
    }
  })

  statusBadgeClass = computed(() => {
    const s = this.ticket()?.status;
    switch (s) {
      case 'Open':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-700/40'
      case 'WaitingSupport':
        return 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700/40'
      case 'WaitingUser':
        return 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-900/20 dark:text-sky-200 dark:border-sky-700/40'
      case 'Closed':
        return 'bg-slate-200 text-slate-700 border-slate-300/70 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600/60'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200/70 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700/60'
    }
  })

  getUserFullNameFromTicket(): string {
    const t: Maybe<Ticket | ClientTicket> = this.ticket()
    if (!t) {
      return ''
    }
    if (this.typeGuards.isTicket(t)) {
      return t.userFullName
    }
    return ''
  }

  async onSend(e: { html: string, delta: any }) {

    const ticketId = this.detailContext.ticketId()

    if (!ticketId) {
      return
    }

    // optimistic minimalissimo
    const optimistic: Omit<ClientTicketMessage, 'ticket'> = {
      id: 'tmp-' + crypto.randomUUID(),
      publicId: '',
      ticketId,
      authorType: this.innerScope() === 'Support' ? 'Support' : 'User',
      contentHtml: e.html,
      contentDelta: e.delta,
      createdAt: new Date().toISOString(),
      triggerDisappear: signal(false),
      collapse: signal(false)
    }

    this.items = [...this.items, optimistic as unknown as ClientTicketMessage]
    this.cdr.markForCheck()

    const add$ = this.innerScope() === 'Support'
      ? this.helpService.addSupportTicketMessage(ticketId, e.delta, e.html)
      : this.helpService.addTicketMessage(ticketId, e.delta, e.html)

    this.composerSub = add$.pipe(
      tap(() => {
        this.ticket.update(t => t ? ({ ...t, lastMessageAt: optimistic.createdAt }) : t)
        this.cdr.markForCheck()
      }),
      catchError((e) => {
        // rollback se fallisce
        this.items = this.items.filter(x => x.id !== optimistic.id)
        this.cdr.markForCheck()
        throw e
      })
    ).subscribe({
      complete: () => queueMicrotask(() => {
        const el = this.root?.nativeElement
        if (el) el.scrollTop = el.scrollHeight
      })
    })
  }

  protected override doQuery(q: string): void {
    // Per adesso non usiamo la ricerca
  }
  protected override doClear(): void {
    // Per adesso non usiamo la ricerca
  }

}
