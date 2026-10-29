import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
  computed,
  DestroyRef,
  viewChild,
  afterNextRender,
  Injector
} from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { NgTemplateOutlet } from '@angular/common'
import { map, of, switchMap, take, tap } from 'rxjs'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { AuthSessionRepository } from '../../services/auth-session-repository.service'
import { HelpService } from '../../services/graphql/help.service'
import { TypeGuardsService } from '../../services/type-guards.service'
import { PaginationController } from '../../services/pagination/pagination-controller'
import { TicketViewModel, toTicketViewModel } from '../../Models/graphql/help.view-models'
import { TabsModule } from 'primeng/tabs'
import { PrimeNG } from 'primeng/config'
import Aura from '@primeuix/themes/aura'
import { TicketCardComponent } from '../../components/support/ticket-card/ticket-card.component'
import { TicketCardSkeletonComponent } from '../../components/support/ticket-card-skeleton/ticket-card-skeleton.component'
import { DomainInvalidationService } from '../../services/domain-invalidation.service'
import { RealtimeSyncStatusService } from '../../services/realtime-sync-status.service'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { GqlV2Error } from '../../services/graphql/graphql-helpers/v2/gql-v2.error'
import {
  ApplicationErrorCode,
  hasApplicationErrorCode
} from '../../utils/application-error.util'
import { PaginationComponent } from '../../components/common/pagination/pagination.component'
import { ButtonComponent } from '../../components/common/button/button.component'

@Component({
  selector: 'm-help-page',
  imports: [
    TabsModule,
    NgTemplateOutlet,
    TicketCardComponent,
    TicketCardSkeletonComponent,
    PaginationComponent,
    ButtonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <main class="main-container" role="main" [attr.aria-busy]="loading">
      <h1 id="help-heading" class="h1-underline" tabindex="-1">
        Supporto
      </h1>

      @if (handleTickets()) {
        <p-tabs class="block mt-4" [value]="activeTab()" (valueChange)="switchTab($event)"
          style="--p-tabs-tablist-background: transparent; --p-tabs-tabpanel-background: transparent; --p-tabs-tab-active-color: var(--m-color-accent-primary); --p-tabs-tab-active-border-color: var(--m-color-accent-primary); --p-tabs-active-bar-background: var(--m-color-accent-primary)">
          <p-tablist class="!bg-transparent" aria-label="Seleziona la sezione dei ticket">
            @for (tab of tabs; track $index) {
              <p-tab [value]="$index">{{ tab }}</p-tab>
            }
          </p-tablist>
          <p-tabpanels class="!p-0 !bg-transparent">
            <p-tabpanel class="!bg-transparent" [value]="0">
              @if (activeTab() === 0) { <ng-container [ngTemplateOutlet]="ticketContent" /> }
            </p-tabpanel>
            <p-tabpanel class="!bg-transparent" [value]="1">
              @if (activeTab() === 1) { <ng-container [ngTemplateOutlet]="ticketContent" /> }
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      } @else {
        <ng-container [ngTemplateOutlet]="ticketContent" />
      }

      <ng-template #ticketContent>
      <section class="mt-6 space-y-6" aria-label="Elenco delle richieste di supporto">
        <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div class="min-w-0">
            <h2 class="m-0 text-xl font-semibold text-light-accent-primary-hc dark:text-dark-accent-primary">{{ activeTab() === 1 ? 'Richieste degli utenti' : 'Le tue richieste' }}</h2>
            <p class="mt-2 mb-0 text-sm text-on-surface-secondary">Consulta i ticket e segui le risposte del supporto.</p>
          </div>
          @if (activeTab() === 0) {
            <m-button ariaLabel="Apri un nuovo ticket di supporto" (pressed)="newTicket()">
              <span class="flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="size-5 shrink-0 fill-current" aria-hidden="true">
            <path d="M145.5 460.9L152.6 443.4L140.7 428.7C112.5 393.8 96 350.6 96 304C96 191 194.3 96 320 96C445.7 96 544 191 544 304C544 417 445.7 512 320 512C287.4 512 256.6 505.6 228.8 494L217.6 489.4L206.1 493.3L120.2 522.8L145.4 460.8zM64 576C78.8 570.9 129.6 553.4 216.5 523.6C248.1 536.7 283.2 544 320 544C461.4 544 576 436.5 576 304C576 171.5 461.4 64 320 64C178.6 64 64 171.5 64 304C64 358.4 83.3 408.6 115.8 448.8C88.7 515.5 71.4 557.9 64 576zM320 224C340.6 224 357.2 240.7 357.2 261.2C357.2 276.9 348.8 285.7 338.7 291.3C328.1 297.3 317.7 298.6 306.1 300L304 300.3L304 352L336 352L336 327.1C341.3 325.4 347.8 323 354.5 319.2C371 309.9 389.3 292.1 389.3 261.2C389.3 223 358.3 192 320.1 192C281.9 192 250.9 223 250.9 261.2L282.9 261.2C282.9 240.6 299.6 224 320.1 224zM300 420L340 420L340 380L300 380L300 420z"/>
          </svg><span>Nuovo ticket</span></span>
            </m-button>
          }
        </div>
        <div class="space-y-3">
          <div class="flex flex-wrap gap-2" role="group" aria-label="Filtra i ticket caricati">
            @for (option of filters; track option.value) {
              <button type="button" class="min-h-11 rounded-full border border-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-accent-primary-hq"
                [class.bg-surface-secondary]="filter() === option.value" [class.border-token-border]="filter() === option.value"
                [attr.aria-pressed]="filter() === option.value" (click)="filter.set(option.value)">{{ option.label }}</button>
            }
          </div>
          <p class="m-0 text-sm text-on-surface-secondary" role="status" aria-live="polite">
            @if (loading && items.length === 0) {
              Caricamento dei ticket…
            } @else if (items.length > 0) {
              {{ visibleItems().length }} {{ filter() === 'open' ? 'non chiusi tra i' : 'visibili su' }} {{ items.length }} ticket caricati
              <span> · {{ totalItems() }} in totale</span>
            } @else if (!paginationError() && done) {
              Nessun ticket presente.
            }
          </p>
          @if (filter() === 'open') {
            <p class="m-0 text-xs text-on-surface-secondary">Il filtro riguarda soltanto i ticket già caricati. Le pagine successive possono contenere altre richieste non chiuse.</p>
          }
        </div>
        <div class="space-y-4">
          @for (item of visibleItems(); track item.id; let i = $index) {
            <m-ticket-card class="block" [attr.data-ticket-id]="item.id" [ticket]="item" [i]="i"
              [cardMode]="activeTab() === 1 ? 'support' : 'user'" [triggerDisappear]="item.triggerDisappear()" [collapse]="item.collapse()"
              [actionPending]="!!pendingActions()[item.id]" [actionError]="actionErrors()[item.id] || ''"
              (onOpenDetail)="openTicketDetail($event)" (close)="onCloseFromCard($event)" (reopen)="onReopenFromCard($event)" />
          }
          @if (loading && page === 1) {
            @for (i of [0, 1, 2, 3, 4]; track i) {
              <m-ticket-card-skeleton class="block" [i]="i" [support]="activeTab() === 1" />
            }
          }
        </div>
        @if (!loading && !paginationError() && visibleItems().length === 0) {
          <div class="rounded-2xl border border-token-border bg-surface-elevated p-5">
            <h3 class="m-0 text-base font-semibold">{{ items.length ? 'Nessuna richiesta non chiusa tra quelle caricate' : 'Le tue richieste saranno raccolte qui' }}</h3>
            <p class="mt-2 mb-4 text-sm text-on-surface-secondary">{{ items.length ? 'Puoi mostrare tutti i ticket o caricare le pagine successive, se disponibili.' : 'Quando avrai bisogno di assistenza, apri un ticket con un oggetto e un messaggio.' }}</p>
            @if (items.length) {
              <m-button variant="outline" size="sm" (pressed)="filter.set('all')">Mostra tutti</m-button>
            } @else if (activeTab() === 0) {
              <m-button variant="outline" (pressed)="newTicket()">Apri il primo ticket</m-button>
            }
          </div>
        }
        <div #sentinel class="h-px w-full" aria-hidden="true"></div>
        @if (paginationError()) {
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-token-border p-4">
            <p role="alert" class="m-0 text-sm text-red-700 dark:text-red-300">Non è stato possibile caricare i ticket. Le richieste già caricate restano disponibili.</p>
            <m-button variant="outline" size="sm" (pressed)="retryPagination()">Riprova</m-button>
          </div>
        } @else {
          <m-pagination [state]="paginationState()" />
          @if (!done && !loading) {
            <div class="flex justify-center"><m-button variant="outline" (pressed)="loadMore()">Carica altri ticket</m-button></div>
          }
        }
      </section>
      </ng-template>
    </main>

  `
})
export class HelpPageComponent implements OnInit, OnDestroy, AfterViewInit {

  private readonly authService = inject(AuthSessionRepository)
  private readonly helpService = inject(HelpService)
  protected readonly typeGuards = inject(TypeGuardsService)
  private readonly invalidations = inject(DomainInvalidationService)
  private readonly syncStatus = inject(RealtimeSyncStatusService)
  private readonly overlayContext = inject(ActionOverlayContextService)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly destroyRef = inject(DestroyRef)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly primeNG = inject(PrimeNG)
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly injector = inject(Injector)
  private readonly returnToTicket = signal<string | null>(null)
  private readonly pagination = new PaginationController<TicketViewModel>({
    merge: (current, incoming) => {
      const merged = new Map(current.map(item => [item.id, item]))
      for (const item of incoming) {
        const previous = merged.get(item.id)
        merged.set(item.id, previous
          ? { ...item, triggerDisappear: previous.triggerDisappear, collapse: previous.collapse }
          : item)
      }
      return [...merged.values()]
    },
    fetch: (page) => {
      const request = this.activeTab() === 1 && this.handleTickets()
        ? this.helpService.ticketsAsSupport(page, this.ITEMS_PER_PAGE)
        : this.helpService.myTickets(page, this.ITEMS_PER_PAGE)
      return request.pipe(
        map(res => ({ ...res, items: res.items.map(toTicketViewModel) })),
        tap(res => this.totalItems.set(res.totalItems))
      )
    }
  })
  private observer?: IntersectionObserver

  protected readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel')
  get items(): TicketViewModel[] { return this.pagination.items() }
  get loading(): boolean { return this.pagination.loading() }
  get done(): boolean { return this.pagination.done() }
  get earlyDone(): boolean { return this.pagination.earlyDone() }
  get page(): number { return this.pagination.page() }
  get empty(): ReturnType<typeof signal<boolean>> { return this.pagination.empty }
  paginationState() { return this.pagination.paginationState() }

  protected readonly tabs = ['Sezione utente', 'Sezione admin']
  private readonly ITEMS_PER_PAGE = 25

  readonly filter = signal<'all' | 'open'>('all')
  readonly filters = [{ value: 'all' as const, label: 'Tutti' }, { value: 'open' as const, label: 'Non chiusi' }]
  readonly visibleItems = computed(() => this.items.filter(item => this.filter() === 'all' || item.status !== 'Closed'))
  readonly pendingActions = signal<Record<string, boolean>>({})
  readonly actionErrors = signal<Record<string, string>>({})
  readonly paginationError = this.pagination.error

  handleTickets = signal<boolean>(false)
  activeTab = signal<0 | 1>(0)
  totalItems = signal<number>(0)

  constructor() {
    this.primeNG.setConfig({ theme: { preset: Aura, options: { darkModeSelector: '.dark' } } })
    effect(() => {
      const ticketId = this.returnToTicket()
      const mounted = this.overlayContext.isMounted()
      const loading = this.pagination.loading()
      this.visibleItems()
      if (!ticketId || mounted || loading) return
      this.returnToTicket.set(null)
      afterNextRender(() => {
        const host = this.element.nativeElement
        if (host.ownerDocument.activeElement !== host.ownerDocument.body) return
        const card = [...host.querySelectorAll<HTMLElement>('[data-ticket-id]')]
          .find(item => item.dataset['ticketId'] === ticketId)
        const target = card?.querySelector<HTMLButtonElement>('button[aria-label^="Apri ticket"]')
          ?? host.querySelector<HTMLElement>('#help-heading')
        target?.focus({ preventScroll: true })
      }, { injector: this.injector })
    })
    effect(() => {
      const event = this.invalidations.last()
      if (!event) return
      const ticketChanged = event.domain === 'ticket' && event.action === 'changed'
      const remoteTicketChanged = ticketChanged && 'remote' in event && event.remote === true
      const reconnect = event.domain === 'realtime' && event.action === 'reconcile'
      if (!ticketChanged && !reconnect) return
      if (remoteTicketChanged) this.syncStatus.markSynchronized()
      queueMicrotask(() => this.resetAndReload())
    })
  }

  ngOnInit(): void {
    const handleTickets =
      (this.authService.getCachedScopes() ?? this.authService.getUserScopesFromClaims(null, true))
        .includes('HandleTickets')

    this.handleTickets.set(handleTickets)
    queueMicrotask(() => void this.loadMore())
  }

  ngAfterViewInit(): void {
    const initialFullUrl = this.getInitialFullUrl()

    this.route.queryParamMap.pipe(
      takeUntilDestroyed(this.destroyRef),
      take(1),
      switchMap(p => {
        const ticketId = p.get('t_id') ?? ''
        const mode = (p.get('m') ?? 'user').toLowerCase()

        if (!ticketId) {
          return of({ ticketId, innerScope: 'User' as const, exists: true })
        }

        const innerScope = mode === 'support' ? 'Support' as const : 'User' as const

        if (innerScope === 'Support') {
          return of({ ticketId, innerScope, exists: true })
        }

        return this.helpService.existsUserTicketById(ticketId).pipe(
          take(1),
          map(exists => ({ ticketId, innerScope, exists }))
        )
      })
    ).subscribe({
      next: ({ ticketId, innerScope, exists }) => {
        if (!ticketId) {
          this.startObserver()
          return
        }

        if (!exists) {
          this.router.navigateByUrl('/404-not-found')
          return
        }

        setTimeout(() => {
          this.overlayContext.open('TicketDetail', { ticketId, innerScope })

          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { t_id: null, m: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          })
        }, 0)

        this.startObserver()
      },
      error: e => {
        if (e instanceof GqlV2Error && e.kind === 'GraphQL') {
          if (hasApplicationErrorCode(
            e,
            ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_SOFT
          )) {
            this.redirectToLoginWithRedirectTo(initialFullUrl)
            return
          }
        }

        this.router.navigateByUrl('/404-not-found')
      }
    })
  }

  ngOnDestroy(): void {
    this.observer?.disconnect()
    this.pagination.dispose()
  }

  switchTab(value: string | number | undefined): void {
    const i = Number(value)
    if (!Number.isInteger(i)) return
    if (i < 0 || i > 1) return
    if (i === 1 && !this.handleTickets()) return

    queueMicrotask(() => {
      this.activeTab.set(i as 0 | 1)
      this.filter.set('all')
      this.resetPagination()
      setTimeout(() => this.startObserver(), 0)
    })
  }

  loadMore(): Promise<void> { return this.pagination.loadMore() }
  retryPagination(): void { this.pagination.retry() }
  resetPagination(): void { this.pagination.reset() }
  private startObserver(): void {
    const sentinel = this.sentinel()?.nativeElement
    if (!sentinel) return
    this.observer?.disconnect()
    this.observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void this.loadMore()
    }, { rootMargin: '0px 0px 500px 0px' })
    this.observer.observe(sentinel)
  }

  private resetAndReload(): void {
    this.resetPagination()
    this.totalItems.set(0)
    this.cdr.markForCheck()
  }

  openTicketDetail(ticketId: string): void {
    queueMicrotask(() => {
      const scope = this.activeTab() === 0 ? 'User' : 'Support'
      this.overlayContext.open('TicketDetail', { ticketId, innerScope: scope })
      this.returnToTicket.set(ticketId)
    })
  }

  newTicket(): void {
    queueMicrotask(() => {
      const innerScope = this.activeTab() === 0 ? 'User' : 'Support'
      this.overlayContext.open('NewTicket', { innerScope })
    })
  }

  onCloseFromCard(ticketId: string): void {
    this.changeTicketStatus(ticketId, false)
  }

  onReopenFromCard(ticketId: string): void {
    if (this.activeTab() === 1 && this.handleTickets()) this.changeTicketStatus(ticketId, true)
  }

  private changeTicketStatus(ticketId: string, reopen: boolean): void {
    if (this.pendingActions()[ticketId]) return
    const tab = this.activeTab()
    this.pendingActions.update(value => ({ ...value, [ticketId]: true }))
    this.actionErrors.update(value => ({ ...value, [ticketId]: '' }))
    const request = reopen
      ? this.helpService.reopenTicketAsSupport(ticketId)
      : tab === 0 || !this.handleTickets()
        ? this.helpService.closeMyTicket(ticketId)
        : this.helpService.closeTicketAsSupport(ticketId)
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ok => {
        this.pendingActions.update(value => ({ ...value, [ticketId]: false }))
        if (tab !== this.activeTab()) return
        if (!ok) {
          this.actionErrors.update(value => ({ ...value, [ticketId]: 'La modifica non è stata confermata. Riprova.' }))
          return
        }
        this.pagination.replaceItems(this.items.map(item => item.id === ticketId
          ? { ...item, status: reopen ? 'Open' as const : 'Closed' as const }
          : item))
      },
      error: () => {
        this.pendingActions.update(value => ({ ...value, [ticketId]: false }))
        if (tab === this.activeTab()) {
          this.actionErrors.update(value => ({ ...value, [ticketId]: 'Impossibile confermare la modifica del ticket. Riprova o aggiorna l’elenco.' }))
        }
      },
    })
  }

  private getInitialFullUrl(): string {
    const raw = this.router.url || ''
    return raw.startsWith('/') ? raw : `/${raw}`
  }

  private redirectToLoginWithRedirectTo(fullUrl: string): void {
    const encoded = encodeURIComponent(fullUrl)
    this.router.navigateByUrl(`/login?redirect_to=${encoded}`)
  }
}
