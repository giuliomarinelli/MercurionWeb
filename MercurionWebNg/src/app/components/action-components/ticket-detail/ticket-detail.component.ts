import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TicketDetailContextService } from '../../../services/context/action-context/ticket-detail-context.service';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import {
  ClientTicket,
  ClientTicketMessage,
  Ticket,
  TicketMessage,
} from '../../../Models/graphql/help.models';
import { AbstractPaginationComponent } from '../../../abstract/abstract-pagination-component';
import { distinctUntilChanged, filter, firstValueFrom, Observable, of, switchMap } from 'rxjs';
import { PageModel } from '../../../Models/graphql/page.models';
import { HelpService } from '../../../services/graphql/help.service';
import { TypeGuardsService } from '../../../services/type-guards.service';
import { MessageItemComponent } from '../message-item/message-item.component';
import { TicketDetailInnerScope } from '../../../Models/action/action-overlay.models';
import { DatePipe, NgClass } from '@angular/common';
import { Maybe } from 'graphql/jsutils/Maybe';
import { TicketComposerComponent } from '../../support/ticket-composer/ticket-composer.component';
import { Subscription } from 'rxjs';
import { AppContextService } from '../../../services/context/app-context.service';

@Component({
  selector: 'm-ticket-detail',
  imports: [MessageItemComponent, DatePipe, NgClass, TicketComposerComponent],
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      :host ::ng-deep .ql-toolbar.ql-snow {
        border: 1px solid rgb(203 213 225 / 0.7);
        border-radius: 0.75rem;
        background: white;
      }

      :host-context(.dark) ::ng-deep .ql-toolbar.ql-snow {
        border-color: rgb(51 65 85 / 0.8);
        background: #1f2937;
      }

      :host ::ng-deep .ql-container.ql-snow {
        border: 1px solid rgb(203 213 225 / 0.7);
        border-radius: 0.75rem;
        background: white;
      }

      :host-context(.dark) ::ng-deep .ql-container.ql-snow {
        border-color: rgb(51 65 85 / 0.8);
        background: #1f2937;
      }

      :host ::ng-deep .ql-editor {
        min-height: 110px;
        font-size: 0.95rem;
      }

      :host-context(.dark) ::ng-deep .ql-editor {
        color: rgb(226 232 240);
      }

      :host-context(.dark) ::ng-deep .ql-editor.ql-blank::before {
        color: rgb(148 163 184);
      }

      :host-context(.dark) ::ng-deep .ql-toolbar button svg,
      :host-context(.dark) ::ng-deep .ql-toolbar .ql-stroke {
        stroke: rgb(226 232 240);
      }
      :host-context(.dark) ::ng-deep .ql-toolbar .ql-fill {
        fill: rgb(226 232 240);
      }
    `,
  ],
  template: `
    <div class="flex justify-center items-center min-h-screen px-2 m-overlay-screen">
      <div
        class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg max-h-[80vh] overflow-y-auto custom-scrollbar m-overlay-max-80 m-overscroll-touch"
        role="region"
        aria-labelledby="ticketDetailHeading"
        [attr.aria-busy]="loading"
      >
        <div
          class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main"
        >
          <h2 id="ticketDetailHeading" class="text-lg font-semibold">
            Dettaglio Ticket&nbsp;
            <span
              class="font-semibold text-light-accent-secondary dark:text-dark-accent-secondary-hc"
              [innerText]="ticket()?.publicId ? '#' + ticket()!.publicId : ''"
            >
            </span>
          </h2>
          <button
            class="inline-flex items-center justify-center size-8 rounded-md text-slate-700 dark:text-slate-200 hover:text-light-accent-primary-hq hover:dark:text-dark-accent-primary-btn-hc hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-light-accent-primary-hq focus:ring-offset-2 focus:dark:ring-dark-accent-primary-btn-hc focus:ring-offset-white dark:focus:ring-offset-transparent transition"
            (click)="close()"
            aria-label="Chiudi dettaglio ticket"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 640 640"
              class="fill-current w-5 h-auto"
            >
              <path
                d="M182.9 137.4L160.3 114.7L115 160L137.6 182.6L275 320L137.6 457.4L115 480L160.3 525.3L182.9 502.6L320.3 365.3L457.6 502.6L480.3 525.3L525.5 480L502.9 457.4L365.5 320L502.9 182.6L525.5 160L480.3 114.7L457.6 137.4L320.3 274.7L182.9 137.4z"
              />
            </svg>
          </button>
        </div>

        @if (ticket()) {
          <div
            class="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col gap-2"
            role="status"
            aria-live="polite"
          >
            <div class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2">
              <span
                class="text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-700/60 border border-slate-300/60 dark:border-slate-600/60 px-2 py-0.5 rounded-full"
              >
                #{{ ticket()!.publicId }}
              </span>

              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 border"
                [ngClass]="statusBadgeClass()"
              >
                {{ statusLabel() }}
              </span>

              @if (innerScope() === 'Support' && typeGuards.isTicket(ticket())) {
                <span
                  class="text-xs text-slate-700 dark:text-slate-200"
                >
                  Utente:
                  <span class="font-medium">
                    {{ getUserFullNameFromTicket() }}
                  </span>
                </span>
              }
            </div>

            <div
              class="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-50"
            >
              {{ ticket()!.subject }}
            </div>

            <div
              class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3 text-xs text-slate-700 dark:text-slate-200"
            >
              <div class="inline-flex items-center gap-1.5">
                <svg
                  class="size-3.5 relative -top-px"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  >
                  <path
                  d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1z"
                  />
                  <path d="M3 8h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
                </svg>
                <span>Creato: {{ ticket()!.createdAt | date: 'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <span class="text-slate-300 dark:text-slate-600">•</span>
              <div class="inline-flex items-center gap-1.5">
                <svg
                    class="size-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                  <path
                    d="M10 2a8 8 0 1 0 8 8 8.01 8.01 0 0 0-8-8Zm.75 4.75a.75.75 0 0 0-1.5 0v3.69l2.72 2.72a.75.75 0 0 0 1.06-1.06l-2.28-2.28V6.75Z"
                  />
                </svg>
                <span
                  >Aggiornato:
                  {{ ticket()!.updatedAt | date: 'dd/MM/yyyy HH:mm' }}</span
                >
              </div>
              <span class="text-slate-300 dark:text-slate-600">•</span>
              <div class="inline-flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-3.5">
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 332.8L306.7 339.9L402.7 403.9L422.7 417.2L449.3 377.3C446.9 375.7 411.8 352.3 344 307.1L344 159.9L296 159.9L296 183.9z"/>
                </svg>
                <span
                  >Ultimo msg:
                  {{ ticket()!.lastMessageAt | date: 'dd/MM/yyyy HH:mm:ss' }}</span
                >
              </div>
            </div>
            <div class="mr-auto flex items-center gap-2 pt-2 pb-1">
              @if (canCloseTicket()) {
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-md border text-xs font-semibold
                         border-slate-400 dark:border-slate-500
                         text-slate-700 dark:text-slate-200
                         hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  (click)="closeTicket()"
                  [attr.aria-disabled]="false"
                  aria-label="Chiudi ticket"
                >
                  Chiudi ticket
                </button>
              }

              @if (canReopenTicket()) {
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-md border text-xs font-semibold
                         border-light-accent-primary-hq dark:border-indigo-400/60
                         text-light-accent-primary-hq dark:text-indigo-200
                         hover:bg-light-accent-primary-hc/20 dark:hover:bg-indigo-900/20 transition"
                  (click)="reopenTicket()"
                  [attr.aria-disabled]="false"
                  aria-label="Riapri ticket"
                >
                  Riapri ticket
                </button>
              }
            </div>
          </div>
        }

        <div
          #scrollRoot
          class="py-6 px-3 overflow-y-auto flex flex-col gap-4 m-overscroll-touch m-overlay-body"
          role="list"
          aria-label="Messaggi del ticket"
          aria-live="polite"
        >
          <div #sentinel class="w-full h-px"></div>

          @for (item of items; track item.id; let i = $index) {
            @if (typeGuards.isTicketMessage(item)) {
              <m-message-item
                [message]="item"
                [selfAuthorType]="innerScope()"
                [showAuthor]="true"
              />
            } @else {
              <m-message-item
                [message]="item"
                [selfAuthorType]="innerScope()"
              />
            }
          }
        </div>

        <div class="border-t border-slate-200/70 dark:border-slate-700/60">
          @if (ticket()?.status !== 'Closed') {
            <m-ticket-composer (send)="onSend($event)" />
          } @else {
            <p class="text-center text-xs py-8 text-slate-700 dark:text-slate-200 cursor-default">Il ticket è chiuso, non è possibile inviare messaggi.</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class TicketDetailComponent extends AbstractPaginationComponent<TicketMessage | ClientTicketMessage> implements OnInit, OnDestroy, AfterViewInit {

  private readonly detailContext = inject(TicketDetailContextService)
  private readonly overlayContext = inject(ActionOverlayContextService)
  private readonly helpService = inject(HelpService)
  protected readonly typeGuards = inject(TypeGuardsService)
  protected readonly cdr = inject(ChangeDetectorRef)
  private readonly appCtx = inject(AppContextService)
  private readonly ticketDetailContext = inject(TicketDetailContextService)
  private firstMessageSet = signal<boolean>(false)

  private composerSub?: Subscription

  private readonly ITEMS_PER_PAGE = 10

  @ViewChild('sentinel')
  protected declare sentinel: ElementRef<HTMLDivElement>

  @ViewChild('scrollRoot')
  protected declare root: ElementRef<HTMLDivElement>

  ticket = signal<Ticket | ClientTicket | null>(null)
  innerScope = computed(
    () => this.detailContext.innerScope() as TicketDetailInnerScope
  )

  canCloseTicket = computed(() => {
    const t = this.ticket()
    if (!t) {
      return false
    }
    return t.status !== 'Closed'
  })

  canReopenTicket = computed(() => {
    const t = this.ticket()
    if (!t) {
      return false
    }
    return this.innerScope() === 'Support' && t.status === 'Closed'
  })


  /** chiave ticket+scope, per capire quando reset tare tutto */
  private currentKey = '';
  /** true dopo il primo load della key corrente, per gestire lo scroll */
  private firstLoadForKey = false;

  constructor() {

    super()

    // reagisce a (ticketId, innerScope) del context
    effect(() => {
      const id = this.detailContext.ticketId();
      const scope = this.detailContext.innerScope();

      if (!id) {
        return
      }

      const key = `${scope}|${id}`;
      if (key === this.currentKey) {
        return
      }

      this.currentKey = key;
      this.resetForNewKey()
    })
  }

  private resetForNewKey(): void {
    this.resetPagination() // del base class
    this.ticket.set(null)
    this.items = []
    this.empty.set(true)
    this.loading = false
    this.done = false
    this.earlyDone = false
    this.firstLoadForKey = false

    // piccolo “pre-scroll” di sicurezza (se il root esiste già)
    queueMicrotask(() => {
      const rootEl = this.root?.nativeElement
      if (rootEl) {
        rootEl.scrollTop = rootEl.scrollHeight
      }
    })

    queueMicrotask(() => this.loadMore())

  }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    this.startObserver();
  }

  ngOnDestroy(): void {
    this.composerSub?.unsubscribe()
    this.observer?.disconnect()
  }

  private smoothToBottom(duration = 200) {
    const rootEl = this.root?.nativeElement;
    if (!rootEl) return;
    const target = rootEl.scrollHeight;
    this.appCtx.smoothTo(this.root, target, duration);
  }

  close(): void {
    queueMicrotask(() => {
      this.overlayContext.close();
      this.detailContext.clearTicketId();
    });
  }

  protected override fetch$(): Observable<PageModel<TicketMessage | ClientTicketMessage>> {
    const scope = this.innerScope();
    const tId = this.detailContext.ticketId();

    return of(null).pipe(
      switchMap(() => {
        if (this.page === 1 && !this.ticket()) {
          return scope === 'User'
            ? this.helpService.myTicketDetail(tId)
            : this.helpService.ticketDetailAsSupport(tId);
        }
        return of(null);
      }),
      switchMap((t: ClientTicket | Ticket | null) => {
        if (t) this.ticket.set(t);

        return scope === 'User'
          ? this.helpService.myTicketMessages(
            this.page,
            this.ITEMS_PER_PAGE,
            tId,
          )
          : this.helpService.ticketMessagesAsSupport(
            this.page,
            this.ITEMS_PER_PAGE,
            tId,
          );
      }),
      filter(Boolean),
      distinctUntilChanged()
    );
  }

  protected override async loadMore(): Promise<void> {
    // se non ho root ancora, non faccio nulla
    const rootEl = this.root?.nativeElement;
    if (!rootEl) return;

    // guardia top: consideriamo "in alto" quando scrollTop è quasi zero
    const isAtTop = rootEl.scrollTop <= 8;

    /**
     * Regola:
     * - page === 1: bootstrap → allowed sempre
     * - page >= 2: allowed solo se l'utente è davvero tornato in alto
     */
    const allowed = this.page === 1 || isAtTop;
    if (!allowed) return;

    if (this.loading || this.done) return;
    this.loading = true;

    const prevHeight = rootEl.scrollHeight;
    const prevTop = rootEl.scrollTop;

    const newPage = await firstValueFrom(this.fetch$());

    if (newPage.items.length === 0) {
      this.done = true;
      if (this.page === 1) this.earlyDone = true;
    } else {
      if (this.empty()) this.empty.set(false);

      // 👇 paracadute anti-overlap (super leggero, ma ti salva sempre)
      const existingIds = new Set(this.items.map(i => i.id));
      const chunk = [...newPage.items]
        .reverse()
        .filter(i => !existingIds.has(i.id));

      if (chunk.length > 0) {
        this.items = [...chunk, ...this.items];
        this.page++;
      } else {
        // se tutto era overlap non avanzi pagina, così non “buchi” dati
        // (al prossimo scroll-up riprovi)
      }
    }

    this.loading = false;

    queueMicrotask(() => {
      // prima pagina della key → scroll in fondo
      if (!this.firstLoadForKey) {
        this.firstLoadForKey = true;
        this.smoothToBottom(180);
        return;
      }

      // pagine successive → preserva posizione
      const newHeight = rootEl.scrollHeight;
      const delta = newHeight - prevHeight;
      rootEl.scrollTop = prevTop + delta;
    });

    this.cdr.markForCheck();
  }


  statusLabel = computed(() => {
    const s = this.ticket()?.status;
    switch (s) {
      case 'Open':
        return 'Aperto';
      case 'WaitingSupport':
        return 'In attesa supporto';
      case 'WaitingUser':
        return 'In attesa utente';
      case 'Closed':
        return 'Chiuso';
      default:
        return String(s ?? '');
    }
  });

  statusBadgeClass = computed(() => {
    const s = this.ticket()?.status;
    switch (s) {
      case 'Open':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/70 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-700/40';
      case 'WaitingSupport':
        return 'bg-amber-50 text-amber-800 border-amber-200/70 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700/40';
      case 'WaitingUser':
        return 'bg-sky-50 text-sky-800 border-sky-200/70 dark:bg-sky-900/20 dark:text-sky-200 dark:border-sky-700/40';
      case 'Closed':
        return 'bg-slate-200 text-slate-800 border-slate-300/70 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600/60';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200/70 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700/60';
    }
  });

  getUserFullNameFromTicket(): string {
    const t: Maybe<Ticket | ClientTicket> = this.ticket();
    if (!t) return '';
    if (this.typeGuards.isTicket(t)) {
      return t.userFullName;
    }
    return '';
  }

  onSend(e: { html: string; delta: any }) {
    const ticketId = this.detailContext.ticketId();
    if (!ticketId) return;

    const nowIso = new Date().toISOString();

    const optimistic: any = {
      id: 'optimistic-' + crypto.randomUUID(),
      publicId: '',
      ticketId,
      authorType: this.innerScope(), // User o Support
      contentDelta: e.delta,
      contentHtml: e.html,
      createdAt: nowIso,
      triggerDisappear: signal(false),
      collapse: signal(false),
    };

    this.items = [...this.items, optimistic];

    queueMicrotask(() => this.smoothToBottom(160));

    const send$ =
      this.innerScope() === 'User'
        ? this.helpService.addTicketMessage(ticketId, e.delta, e.html)
        : this.helpService.addSupportTicketMessage(ticketId, e.delta, e.html);

    send$.subscribe({
      next: () => {
        // in futuro rimpiazzo via WS
      },
      error: () => {
        this.items = this.items.filter((m) => m.id !== optimistic.id);
        // TODO: toast
      },
    });
  }

  private setTicketStatus(status: 'Open' | 'Closed') {
    const t = this.ticket()
    if (!t) {
      return
    }
    this.ticket.set({ ...t, status })
    this.cdr.markForCheck()
  }

  closeTicket(): void {
    const t = this.ticket()
    const ticketId = t?.id
    if (!ticketId) {
      return
    }

    const close$ = this.innerScope() === 'User'
      ? this.helpService.closeMyTicket(ticketId)
      : this.helpService.closeTicketAsSupport(ticketId)

    close$.subscribe({
      next: (ok) => {
        if (ok) {
          this.setTicketStatus('Closed')
          this.ticketDetailContext.notifyAdded()
        }
      },
      error: () => {
        // TODO toast
      }
    });
  }

  reopenTicket(): void {
    const t = this.ticket()
    const ticketId = t?.id
    if (!ticketId) return

    if (this.innerScope() !== 'Support') {
      return
    }

    this.helpService.reopenTicketAsSupport(ticketId).subscribe({
      next: (ok) => {
        if (ok) {
          this.setTicketStatus('Open')
          this.ticketDetailContext.notifyAdded()
        }
      },
      error: () => {
        // TODO toast
      }
    });
  }


  protected override doQuery(q: string): void { }
  protected override doClear(): void { }



}
