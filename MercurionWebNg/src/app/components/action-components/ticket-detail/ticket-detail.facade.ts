import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { JsonValue } from '../../../Models/json.models';
import { TicketDetailInnerScope } from '../../../Models/action/action-overlay.models';
import {
  TicketMessageViewModel,
  TicketViewModel,
  toTicketMessageViewModel,
  toTicketViewModel,
} from '../../../Models/graphql/help.view-models';
import { TicketDetailContextService } from '../../../services/context/action-context/ticket-detail-context.service';
import { DomainInvalidationService } from '../../../services/domain-invalidation.service';
import { HelpService } from '../../../services/graphql/help.service';

export interface TicketCapabilities {
  readonly canClose: boolean;
  readonly canReopen: boolean;
  readonly canSend: boolean;
  readonly showRequester: boolean;
}

export interface TicketThreadState {
  readonly page: number;
  readonly pending: boolean;
  readonly error: string | null;
  readonly done: boolean;
}

export type TicketComposerState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending'; readonly optimisticId: string }
  | { readonly kind: 'error'; readonly message: string };

export type TicketDetailState =
  | { readonly kind: 'loading'; readonly ticketId: string }
  | { readonly kind: 'error'; readonly ticketId: string; readonly message: string }
  | {
      readonly kind: 'content';
      readonly ticketId: string;
      readonly scope: TicketDetailInnerScope;
      readonly ticket: TicketViewModel;
      readonly messages: readonly TicketMessageViewModel[];
      readonly thread: TicketThreadState;
      readonly composer: TicketComposerState;
      readonly capabilities: TicketCapabilities;
      readonly commandPending: boolean;
    };

export interface TicketMessageDraft {
  readonly html: string;
  readonly delta: JsonValue;
}

@Injectable()
export class TicketDetailFacade {
  private readonly context = inject(TicketDetailContextService);
  private readonly help = inject(HelpService);
  private readonly invalidation = inject(DomainInvalidationService);
  private readonly ticket = signal<TicketViewModel | null>(null);
  private readonly messages = signal<readonly TicketMessageViewModel[]>([]);
  private readonly detailPending = signal(false);
  private readonly detailError = signal<string | null>(null);
  private readonly thread = signal<TicketThreadState>({ page: 1, pending: false, error: null, done: false });
  private readonly composer = signal<TicketComposerState>({ kind: 'idle' });
  private readonly commandPending = signal(false);
  private readonly activeKey = signal('');
  private detailRequest?: Subscription;
  private pageRequest?: Subscription;
  private submitRequest?: Subscription;
  private commandRequest?: Subscription;
  private lastDraft: TicketMessageDraft | null = null;
  private requestVersion = 0;
  private readonly pageSize = 10;

  readonly scope = computed(() => this.context.innerScope() as TicketDetailInnerScope);
  readonly capabilities = computed<TicketCapabilities>(() => {
    const ticket = this.ticket();
    const scope = this.scope();
    return {
      canClose: !!ticket && ticket.status !== 'Closed',
      canReopen: !!ticket && scope === 'Support' && ticket.status === 'Closed',
      canSend: !!ticket && ticket.status !== 'Closed',
      showRequester: scope === 'Support',
    };
  });
  readonly state = computed<TicketDetailState>(() => {
    const ticketId = this.context.ticketId();
    const ticket = this.ticket();
    const error = this.detailError();
    if (error) return { kind: 'error', ticketId, message: error };
    if (this.detailPending() || !ticket) return { kind: 'loading', ticketId };
    return {
      kind: 'content',
      ticketId,
      scope: this.scope(),
      ticket,
      messages: this.messages(),
      thread: this.thread(),
      composer: this.composer(),
      capabilities: this.capabilities(),
      commandPending: this.commandPending(),
    };
  });

  constructor() {
    effect(() => {
      const ticketId = this.context.ticketId();
      const scope = this.scope();
      const key = ticketId ? `${scope}|${ticketId}` : '';
      if (!key || key === this.activeKey()) return;
      this.activeKey.set(key);
      this.resetAndLoad(ticketId, scope);
    });
  }

  private resetAndLoad(ticketId: string, scope: TicketDetailInnerScope): void {
    const version = ++this.requestVersion;
    this.cancelRequests();
    this.ticket.set(null);
    this.messages.set([]);
    this.detailError.set(null);
    this.detailPending.set(true);
    this.thread.set({ page: 1, pending: false, error: null, done: false });
    this.composer.set({ kind: 'idle' });
    this.lastDraft = null;
    const detail$ = scope === 'User'
      ? this.help.myTicketDetail(ticketId)
      : this.help.ticketDetailAsSupport(ticketId);
    this.detailRequest = detail$.subscribe({
      next: detail => {
        if (version !== this.requestVersion) return;
        this.ticket.set(toTicketViewModel(detail));
        this.detailPending.set(false);
        this.loadMore();
      },
      error: () => {
        if (version !== this.requestVersion) return;
        this.detailPending.set(false);
        this.detailError.set('Impossibile caricare il dettaglio del ticket.');
      },
    });
  }

  loadMore(): void {
    const ticketId = this.context.ticketId();
    const current = this.thread();
    if (!ticketId || current.pending || current.done || !this.ticket()) return;
    const version = this.requestVersion;
    const page = current.page;
    this.pageRequest?.unsubscribe();
    this.thread.set({ ...current, pending: true, error: null });
    const page$ = this.scope() === 'User'
      ? this.help.myTicketMessages(page, this.pageSize, ticketId)
      : this.help.ticketMessagesAsSupport(page, this.pageSize, ticketId);
    this.pageRequest = page$.subscribe({
      next: result => {
        if (version !== this.requestVersion) return;
        const existing = new Set(this.messages().map(message => message.id));
        const older = [...result.items].reverse()
          .map(toTicketMessageViewModel)
          .filter(message => !existing.has(message.id));
        this.messages.update(messages => [...older, ...messages]);
        this.thread.set({
          page: older.length ? page + 1 : page,
          pending: false,
          error: null,
          done: result.items.length === 0 || result.currentPage >= result.totalPages,
        });
      },
      error: () => {
        if (version !== this.requestVersion) return;
        this.thread.update(state => ({ ...state, pending: false, error: 'Impossibile caricare altri messaggi.' }));
      },
    });
  }

  retryPage(): void {
    this.thread.update(state => ({ ...state, error: null }));
    this.loadMore();
  }

  submit(draft: TicketMessageDraft): void {
    if (!this.capabilities().canSend || this.composer().kind === 'pending') return;
    const ticketId = this.context.ticketId();
    const version = this.requestVersion;
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    this.lastDraft = draft;
    this.messages.update(messages => [...messages, toTicketMessageViewModel({
      id: optimisticId,
      publicId: '',
      ticketId,
      authorType: this.scope(),
      contentDelta: typeof draft.delta === 'string' ? draft.delta : JSON.stringify(draft.delta),
      contentHtml: draft.html,
      createdAt: new Date().toISOString(),
    })]);
    this.composer.set({ kind: 'pending', optimisticId });
    const submit$ = this.scope() === 'User'
      ? this.help.addTicketMessage(ticketId, draft.delta, draft.html)
      : this.help.addSupportTicketMessage(ticketId, draft.delta, draft.html);
    this.submitRequest = submit$.subscribe({
      next: ok => {
        if (version !== this.requestVersion) return;
        if (!ok) {
          this.failSubmit(optimisticId);
          return;
        }
        this.composer.set({ kind: 'idle' });
        this.lastDraft = null;
      },
      error: () => {
        if (version === this.requestVersion) this.failSubmit(optimisticId);
      },
    });
  }

  private failSubmit(optimisticId: string): void {
    this.messages.update(messages => messages.filter(message => message.id !== optimisticId));
    this.composer.set({ kind: 'error', message: 'Invio non riuscito.' });
  }

  retrySubmit(): void {
    const draft = this.lastDraft;
    if (!draft || this.composer().kind !== 'error') return;
    this.submit(draft);
  }

  cancelSubmit(): void {
    const state = this.composer();
    this.submitRequest?.unsubscribe();
    if (state.kind === 'pending') {
      this.messages.update(messages => messages.filter(message => message.id !== state.optimisticId));
    }
    this.lastDraft = null;
    this.composer.set({ kind: 'idle' });
  }

  closeTicket(): void {
    this.setStatus('Closed');
  }

  reopenTicket(): void {
    if (this.scope() !== 'Support') return;
    this.setStatus('Open');
  }

  private setStatus(status: 'Open' | 'Closed'): void {
    const ticket = this.ticket();
    if (!ticket || this.commandPending()) return;
    this.commandPending.set(true);
    const request$ = status === 'Open'
      ? this.help.reopenTicketAsSupport(ticket.id)
      : this.scope() === 'User'
        ? this.help.closeMyTicket(ticket.id)
        : this.help.closeTicketAsSupport(ticket.id);
    this.commandRequest = request$.subscribe({
      next: ok => {
        this.commandPending.set(false);
        if (!ok) return;
        this.ticket.update(value => value ? { ...value, status } : value);
        this.invalidation.publish({
          domain: 'ticket', action: 'changed', ticketId: this.context.ticketId(), scope: this.scope()
        });
      },
      error: () => this.commandPending.set(false),
    });
  }

  reload(): void {
    const ticketId = this.context.ticketId();
    if (ticketId) this.resetAndLoad(ticketId, this.scope());
  }

  destroy(): void {
    this.requestVersion++;
    this.cancelRequests();
  }

  private cancelRequests(): void {
    this.detailRequest?.unsubscribe();
    this.pageRequest?.unsubscribe();
    this.submitRequest?.unsubscribe();
    this.commandRequest?.unsubscribe();
  }
}
