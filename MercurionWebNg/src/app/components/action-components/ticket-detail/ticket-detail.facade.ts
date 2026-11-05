import { computed, effect, inject, Injectable, untracked } from '@angular/core'
import { signal } from '@angular/core'
import { forkJoin, Subscription } from 'rxjs'
import { JsonValue } from '../../../Models/json.models'
import { TicketDetailInnerScope } from '../../../Models/action/action-overlay.models'
import {
  TicketMessageViewModel,
  TicketViewModel,
  toTicketMessageViewModel,
  toTicketViewModel,
} from '../../../Models/graphql/help.view-models'
import { TicketDetailContextService } from '../../../services/context/action-context/ticket-detail-context.service'
import { DomainInvalidationService } from '../../../services/domain-invalidation.service'
import { RealtimeSyncStatusService } from '../../../services/realtime-sync-status.service'
import { HelpService } from '../../../services/graphql/help.service'

export interface TicketCapabilities {
  readonly canClose: boolean
  readonly canReopen: boolean
  readonly canSend: boolean
  readonly showRequester: boolean
}

export interface TicketThreadState {
  readonly page: number
  readonly pending: boolean
  readonly error: string | null
  readonly done: boolean
}

export type TicketComposerState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'error'; readonly message: string }

export type TicketDetailState =
  | { readonly kind: 'loading'; readonly ticketId: string }
  | { readonly kind: 'error'; readonly ticketId: string; readonly message: string }
  | {
      readonly kind: 'content'
      readonly ticketId: string
      readonly scope: TicketDetailInnerScope
      readonly ticket: TicketViewModel
      readonly messages: readonly TicketMessageViewModel[]
      readonly thread: TicketThreadState
      readonly composer: TicketComposerState
      readonly capabilities: TicketCapabilities
      readonly commandPending: boolean
      readonly commandError: string | null
      readonly refreshing: boolean
      readonly refreshError: string | null
      readonly sentRevision: number
    }

export interface TicketMessageDraft {
  readonly html: string
  readonly delta: JsonValue
}

@Injectable()
export class TicketDetailFacade {
  private readonly context = inject(TicketDetailContextService)
  private readonly help = inject(HelpService)
  private readonly invalidation = inject(DomainInvalidationService)
  private readonly syncStatus = inject(RealtimeSyncStatusService)
  private readonly ticket = signal<TicketViewModel | null>(null)
  private readonly messages = signal<readonly TicketMessageViewModel[]>([])
  private readonly detailError = signal<string | null>(null)
  private readonly thread = signal<TicketThreadState>({ page: 1, pending: false, error: null, done: false })
  private readonly composer = signal<TicketComposerState>({ kind: 'idle' })
  private readonly commandPending = signal(false)
  private readonly commandError = signal<string | null>(null)
  private readonly refreshing = signal(false)
  private readonly refreshError = signal<string | null>(null)
  private readonly sentRevision = signal(0)
  private detailRequest?: Subscription
  private pageRequest?: Subscription
  private submitRequest?: Subscription
  private commandRequest?: Subscription
  private refreshRequest?: Subscription
  private requestVersion = 0
  private activeKey = ''
  private refreshQueued = false
  private destroyed = false
  private readonly pageSize = 10

  readonly scope = computed(() => this.context.innerScope())
  readonly capabilities = computed<TicketCapabilities>(() => {
    const ticket = this.ticket()
    return {
      canClose: !!ticket && ticket.status !== 'Closed',
      canReopen: !!ticket && this.scope() === 'Support' && ticket.status === 'Closed',
      canSend: !!ticket && ticket.status !== 'Closed',
      showRequester: this.scope() === 'Support',
    }
  })
  readonly state = computed<TicketDetailState>(() => {
    const ticketId = this.context.ticketId()
    const ticket = this.ticket()
    const error = this.detailError()
    if (error) return { kind: 'error', ticketId, message: error }
    if (!ticket) return { kind: 'loading', ticketId }
    return {
      kind: 'content', ticketId, scope: this.scope(), ticket,
      messages: this.messages(), thread: this.thread(), composer: this.composer(),
      capabilities: this.capabilities(), commandPending: this.commandPending(),
      commandError: this.commandError(), refreshing: this.refreshing(),
      refreshError: this.refreshError(), sentRevision: this.sentRevision(),
    }
  })

  constructor() {
    effect(() => {
      const ticketId = this.context.ticketId()
      const scope = this.scope()
      if (ticketId) untracked(() => this.resetAndLoad(ticketId, scope))
    })
    effect(() => {
      const event = this.invalidation.last()
      const ticketId = this.context.ticketId()
      const scope = this.scope()
      if (!event || !ticketId) return
      const reconnect = event.domain === 'realtime' && event.action === 'reconcile'
      const changed = event.domain === 'ticket' && event.action === 'changed' &&
        'remote' in event && event.remote === true &&
        (!event.resourceId || event.resourceId === ticketId)
      if (!changed && !reconnect) return
      const version = this.requestVersion
      queueMicrotask(() => {
        if (!this.isCurrent(version) || ticketId !== this.context.ticketId() || scope !== this.scope()) return
        this.refresh()
      })
    })
  }

  private isCurrent(version: number): boolean {
    return !this.destroyed && version === this.requestVersion &&
      this.activeKey === `${this.scope()}|${this.context.ticketId()}`
  }

  private resetAndLoad(ticketId: string, scope: TicketDetailInnerScope): void {
    const version = ++this.requestVersion
    this.activeKey = `${scope}|${ticketId}`
    this.cancelRequests()
    this.refreshQueued = false
    this.refreshing.set(false)
    this.refreshError.set(null)
    this.commandPending.set(false)
    this.commandError.set(null)
    this.ticket.set(null)
    this.messages.set([])
    this.detailError.set(null)
    this.thread.set({ page: 1, pending: false, error: null, done: false })
    this.composer.set({ kind: 'idle' })
    this.sentRevision.set(0)
    const detail$ = scope === 'User'
      ? this.help.myTicketDetail(ticketId)
      : this.help.ticketDetailAsSupport(ticketId)
    this.detailRequest = detail$.subscribe({
      next: detail => {
        if (!this.isCurrent(version)) return
        if (!detail?.id) {
          this.detailError.set('Il ticket non è disponibile. Chiudi il pannello e aggiorna la lista.')
          return
        }
        this.ticket.set(toTicketViewModel(detail))
        this.loadMore()
      },
      error: () => {
        if (this.isCurrent(version)) this.detailError.set('Impossibile caricare il dettaglio del ticket.')
      },
    })
  }

  private messagePage(page: number) {
    const ticketId = this.context.ticketId()
    return this.scope() === 'User'
      ? this.help.myTicketMessages(page, this.pageSize, ticketId)
      : this.help.ticketMessagesAsSupport(page, this.pageSize, ticketId)
  }

  loadMore(): void {
    const current = this.thread()
    if (!this.ticket() || current.pending || current.done || this.refreshing()) return
    const version = this.requestVersion
    const page = current.page
    this.thread.set({ ...current, pending: true, error: null })
    this.pageRequest = this.messagePage(page).subscribe({
      next: result => {
        if (!this.isCurrent(version)) return
        const known = new Set(this.messages().map(message => message.id))
        const older = [...result.items].reverse().filter(message => {
          if (known.has(message.id)) return false
          known.add(message.id)
          return true
        }).map(toTicketMessageViewModel)
        this.messages.update(messages => this.chronological([...older, ...messages]))
        this.thread.set({
          page: page + 1, pending: false, error: null,
          done: result.items.length === 0 || result.currentPage >= result.totalPages,
        })
        this.flushRefresh()
      },
      error: () => {
        if (!this.isCurrent(version)) return
        this.thread.update(state => ({ ...state, pending: false, error: 'Impossibile caricare i messaggi. La conversazione già caricata è conservata.' }))
        this.flushRefresh()
      },
    })
  }

  retryPage(): void {
    this.loadMore()
  }

  /** Refresh loaded pages without unmounting the composer or cancelling a send. */
  refresh(): void {
    if (!this.ticket() || this.destroyed) return
    if (this.thread().pending || this.refreshing() || this.commandPending()) {
      this.refreshQueued = true
      return
    }
    const version = this.requestVersion
    const ticketId = this.context.ticketId()
    const detail$ = this.scope() === 'User'
      ? this.help.myTicketDetail(ticketId)
      : this.help.ticketDetailAsSupport(ticketId)
    const loadedPages = Math.max(1, this.thread().page - 1)
    this.refreshing.set(true)
    this.refreshError.set(null)
    this.refreshRequest = forkJoin({
      detail: detail$,
      pages: forkJoin(Array.from({ length: loadedPages }, (_, index) => this.messagePage(index + 1))),
    }).subscribe({
      next: ({ detail, pages }) => {
        if (!this.isCurrent(version)) return
        if (!detail?.id) {
          this.refreshFailed()
          return
        }
        this.ticket.set(toTicketViewModel(detail))
        // Retain older loaded messages displaced by new arrivals in offset pagination.
        const merged = new Map(this.messages().map(message => [message.id, message]))
        for (const page of pages) {
          for (const message of page.items) merged.set(message.id, toTicketMessageViewModel(message))
        }
        this.messages.set(this.chronological([...merged.values()]))
        this.thread.set({
          page: loadedPages + 1, pending: false, error: null,
          done: loadedPages >= pages[0].totalPages,
        })
        this.refreshing.set(false)
        this.syncStatus.markSynchronized()
        this.flushRefresh()
      },
      error: () => {
        if (this.isCurrent(version)) this.refreshFailed()
      },
    })
  }

  private refreshFailed(): void {
    this.refreshing.set(false)
    this.refreshError.set('Aggiornamento non riuscito. I messaggi già caricati e la bozza sono conservati.')
    this.flushRefresh()
  }

  private chronological(messages: TicketMessageViewModel[]): TicketMessageViewModel[] {
    const timestamp = (value: string) => Number(value) || Date.parse(value) || 0
    return messages.sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt))
  }

  private flushRefresh(): void {
    if (!this.refreshQueued) return
    this.refreshQueued = false
    this.refresh()
  }

  submit(draft: TicketMessageDraft): void {
    if (!this.capabilities().canSend || this.commandPending() || this.composer().kind === 'pending') return
    const ticketId = this.context.ticketId()
    const version = this.requestVersion
    this.composer.set({ kind: 'pending' })
    const submit$ = this.scope() === 'User'
      ? this.help.addTicketMessage(ticketId, draft.delta, draft.html)
      : this.help.addSupportTicketMessage(ticketId, draft.delta, draft.html)
    this.submitRequest = submit$.subscribe({
      next: ok => {
        if (!this.isCurrent(version)) return
        if (!ok) {
          this.failSubmit()
          return
        }
        this.composer.set({ kind: 'idle' })
        this.sentRevision.update(value => value + 1)
        this.invalidation.publish({ domain: 'ticket', action: 'changed', ticketId, scope: this.scope() })
        this.refresh()
      },
      error: () => {
        if (this.isCurrent(version)) this.failSubmit()
      },
    })
  }

  private failSubmit(): void {
    this.composer.set({ kind: 'error', message: 'Invio non confermato. La bozza è conservata: aggiorna la conversazione prima di riprovare per evitare duplicati.' })
  }

  closeTicket(): void {
    if (this.capabilities().canClose) this.setStatus('Closed')
  }

  reopenTicket(): void {
    if (this.capabilities().canReopen) this.setStatus('Open')
  }

  private setStatus(status: 'Open' | 'Closed'): void {
    const ticket = this.ticket()
    if (!ticket || this.commandPending() || this.refreshing() || this.composer().kind === 'pending') return
    const version = this.requestVersion
    this.commandPending.set(true)
    this.commandError.set(null)
    const request$ = status === 'Open'
      ? this.help.reopenTicketAsSupport(ticket.id)
      : this.scope() === 'User'
        ? this.help.closeMyTicket(ticket.id)
        : this.help.closeTicketAsSupport(ticket.id)
    this.commandRequest = request$.subscribe({
      next: ok => {
        if (!this.isCurrent(version)) return
        this.commandPending.set(false)
        if (!ok) {
          this.commandError.set('Modifica dello stato non confermata. Aggiorna il ticket prima di riprovare.')
          this.flushRefresh()
          return
        }
        this.ticket.update(value => value ? { ...value, status } : value)
        this.invalidation.publish({ domain: 'ticket', action: 'changed', ticketId: ticket.id, scope: this.scope() })
        this.flushRefresh()
      },
      error: () => {
        if (!this.isCurrent(version)) return
        this.commandPending.set(false)
        this.commandError.set('Impossibile modificare lo stato del ticket. Riprova.')
        this.flushRefresh()
      },
    })
  }

  reload(): void {
    if (this.ticket()) this.refresh()
    else if (this.context.ticketId()) this.resetAndLoad(this.context.ticketId(), this.scope())
  }

  destroy(): void {
    this.destroyed = true
    this.requestVersion++
    this.cancelRequests()
  }

  private cancelRequests(): void {
    this.detailRequest?.unsubscribe()
    this.pageRequest?.unsubscribe()
    this.submitRequest?.unsubscribe()
    this.commandRequest?.unsubscribe()
    this.refreshRequest?.unsubscribe()
  }
}
