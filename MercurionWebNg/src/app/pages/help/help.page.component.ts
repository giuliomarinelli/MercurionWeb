import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Observable, Subscription, firstValueFrom, of, switchMap, take, tap } from 'rxjs'
import { AuthService } from '../../services/auth.service'
import { HelpService } from '../../services/graphql/help.service'
import { TypeGuardsService } from '../../services/type-guards.service'
import { AbstractPaginationComponent } from '../../abstract/abstract-pagination-component'
import { PageModel } from '../../Models/graphql/page.models'
import { Ticket, ClientTicket } from '../../Models/graphql/help.models'
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component'
import { TabsComponent } from '../../components/common/tabs/tabs.component'
import { TicketCardComponent } from '../../components/support/ticket-card/ticket-card.component'
import { TicketCardSkeletonComponent } from '../../components/support/ticket-card-skeleton/ticket-card-skeleton.component'
import { TicketDetailContextService } from '../../services/context/action-context/ticket-detail-context.service'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { NewTicketContextService } from '../../services/context/action-context/new-ticket-context.service'
import { GqlV2Error } from '../../services/graphql/graphql-helpers/v2/gql-v2.error'

@Component({
  selector: 'm-help-page',
  imports: [
    ClassicSpinnerComponent,
    TabsComponent,
    TicketCardComponent,
    TicketCardSkeletonComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    <main class="main-container" role="main" [attr.aria-busy]="loading">
      <h1 id="help-heading" class="h1-underline">
        Supporto
      </h1>

      @if (handleTickets()) {
        <m-tabs class="block mt-4" [tabs]="tabs" (tabChange)="switchTab($event)" [activeIndex]="activeTab()" aria-label="Seleziona la sezione dei ticket" />
      }

      <div [class.pt-4]="handleTickets()">
        <button
          type="button"
          (click)="newTicket()"
          class="relative bottom-[10px] w-fit mx-auto text-xs min-[374px]:text-base sm:mx-0 mt-1 py-2.5 px-8 text-white rounded-md transition-colors duration-150 bg-light-accent-primary-hq dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary-hc dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary-hq/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary-hq/60 disabled:hover:dark:bg-dark-accent-primary/80 flex justify-center items-center gap-2"
          aria-label="Apri un nuovo ticket di supporto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-7 relative -left-1.5" aria-hidden="true">
            <path d="M145.5 460.9L152.6 443.4L140.7 428.7C112.5 393.8 96 350.6 96 304C96 191 194.3 96 320 96C445.7 96 544 191 544 304C544 417 445.7 512 320 512C287.4 512 256.6 505.6 228.8 494L217.6 489.4L206.1 493.3L120.2 522.8L145.4 460.8zM64 576C78.8 570.9 129.6 553.4 216.5 523.6C248.1 536.7 283.2 544 320 544C461.4 544 576 436.5 576 304C576 171.5 461.4 64 320 64C178.6 64 64 171.5 64 304C64 358.4 83.3 408.6 115.8 448.8C88.7 515.5 71.4 557.9 64 576zM320 224C340.6 224 357.2 240.7 357.2 261.2C357.2 276.9 348.8 285.7 338.7 291.3C328.1 297.3 317.7 298.6 306.1 300L304 300.3L304 352L336 352L336 327.1C341.3 325.4 347.8 323 354.5 319.2C371 309.9 389.3 292.1 389.3 261.2C389.3 223 358.3 192 320.1 192C281.9 192 250.9 223 250.9 261.2L282.9 261.2C282.9 240.6 299.6 224 320.1 224zM300 420L340 420L340 380L300 380L300 420z"/>
          </svg>
          <span>
            Apri un nuovo ticket di suporto
          </span>
        </button>
      </div>

      <p class="my-4 font-medium">
        @if (handleTickets() && activeTab() === 1) {
          Gli utenti hanno creato complessivamente&nbsp;<strong class="text-light-accent-primary-hc dark:text-dark-accent-primary">{{totalItems()}}</strong>&nbsp;ticket
        } @else {
          Ci sono un totale di&nbsp;<strong class="text-light-accent-primary-hc dark:text-dark-accent-primary">{{totalItems()}}</strong>&nbsp;ticket
        }
      </p>

      <div class="mt-px relative -top-8">
        @for (item of items; track item.id; let i = $index) {
          <m-ticket-card
            [ticket]="item"
            [i]="i"
            [cardMode]="typeGuards.isClientTicket(item) ? 'user' : (typeGuards.isTicket(item) ? 'support' : 'user')"
            [triggerDisappear]="item.triggerDisappear()"
            [collapse]="item.collapse()"
            (onOpenDetail)="openTicketDetail($event)"
            (close)="onCloseFromCard($event)"
            (reopen)="onReopenFromCard($event)" />
        }
      </div>

      <div #sentinel class="h-px w-full"></div>

      @if (loading) {
        @if (page > 1 && items.length > 2) {
          <div class="flex justify-center">
            <m-classic-spinner [size]="60" />
          </div>
        } @else {
          <div class="relative -top-20">
            @for (i of [0, 1, 2, 3, 4]; track i) {
              <m-ticket-card-skeleton [i]="i" />
            }
          </div>
        }
      } @else if (empty() && (earlyDone)) {
        <p class="relative -top-8 text-slate-700 dark:text-slate-200" role="status" aria-live="polite">
          Non sono ancora presenti ticket&nbsp;<button class="a" type="button" aria-label="Apri adesso il tuo primo ticket">Apri adesso il tuo primo ticket</button>
        </p>
      }
    </main>

  `
})
export class HelpPageComponent extends AbstractPaginationComponent<Ticket | ClientTicket> implements OnInit, OnDestroy, AfterViewInit {

  private readonly authService = inject(AuthService)
  private readonly helpService = inject(HelpService)
  protected readonly typeGuards = inject(TypeGuardsService)
  private readonly detailContext = inject(TicketDetailContextService)
  private readonly overlayContext = inject(ActionOverlayContextService)
  private readonly newTicketContext = inject(NewTicketContextService)
  private readonly cdr = inject(ChangeDetectorRef)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  @ViewChild('sentinel')
  protected declare sentinel: ElementRef<HTMLDivElement>

  protected readonly tabs = ['Sezione utente', 'Sezione admin']
  private readonly ITEMS_PER_PAGE = 25

  private clsSub?: Subscription
  private ropSub?: Subscription

  handleTickets = signal<boolean>(false)
  activeTab = signal<0 | 1>(0)
  totalItems = signal<number>(0)

  constructor() {
    super()

    effect(() => {
      const tick = this.detailContext.addedTick()
      if (!tick) return
      this.resetAndReload()
    })

    effect(() => {
      const t = this.newTicketContext.addedTick()
      if (t === 0 || this.activeTab() !== 0) return
      this.resetAndReload()
    })
  }

  ngOnInit(): void {
    const handleTickets =
      (this.authService.getCachedScopes() ?? this.authService.getUserScopesFromClaims(null, true))
        .includes('HandleTickets')

    this.handleTickets.set(handleTickets)
    queueMicrotask(() => this.loadMore())
  }

  ngAfterViewInit(): void {
    const initialFullUrl = this.getInitialFullUrl()

    this.route.queryParamMap.pipe(take(1)).subscribe(p => {
      const ticketId = p.get('t_id') ?? ''
      const mode = (p.get('m') ?? 'user').toLowerCase()

      if (!ticketId) {
        this.startObserver()
        return
      }

      const innerScope = mode === 'support' ? 'Support' : 'User'

      this.helpService.existsUserTicketById(ticketId).pipe(take(1)).subscribe({
        next: exists => {
          if (!exists) {
            this.router.navigateByUrl('/404-not-found')
            return
          }

          setTimeout(() => {
            this.detailContext.setInnerScope(innerScope)
            this.detailContext.setTicketId(ticketId)
            this.overlayContext.open('TicketDetail')

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
            const msg = e.gqlErrors[0]?.message
            const code = e.gqlErrors[0]?.extensions?.code

            if (msg === 'Unauthenticated' && code === 'UNAUTHENTICATED') {
              this.redirectToLoginWithRedirectTo(initialFullUrl)
              return
            }
          }

          this.router.navigateByUrl('/404-not-found')
        }
      })
    })
  }

  ngOnDestroy(): void {
    this.clsSub?.unsubscribe()
    this.ropSub?.unsubscribe()
    this.observer?.disconnect()
  }

  switchTab(i: number): void {
    if (i < 0 || i > 1) return
    if (i === 1 && !this.handleTickets()) return

    queueMicrotask(() => {
      this.activeTab.set(i as 0 | 1)
      this.resetPagination()
    })
  }

  protected override fetch$(): Observable<PageModel<Ticket | ClientTicket>> {
    return of(null).pipe(
      switchMap(() => {
        if (this.activeTab() === 1) {
          if (this.handleTickets()) return this.helpService.ticketsAsSupport(this.page, this.ITEMS_PER_PAGE)
          queueMicrotask(() => this.activeTab.set(0))
        }
        return this.helpService.myTickets(this.page, this.ITEMS_PER_PAGE)
      }),
      tap(res => this.totalItems.set(res.totalItems))
    )
  }

  protected override async loadMore(): Promise<void> {
    if (this.loading || this.done) return

    this.loading = true

    const newPage = await firstValueFrom(this.fetch$())

    if (newPage.items.length === 0) {
      this.done = true
      if (this.page === 1) this.earlyDone = true
    } else {
      if (this.empty()) this.empty.set(false)
      this.items = [...this.items, ...newPage.items]
      this.page++
    }

    this.cdr.markForCheck()
    this.loading = false
  }

  protected override doQuery(q: string): void { }

  protected override doClear(): void { }

  private resetAndReload(): void {
    this.resetPagination()
    this.totalItems.set(0)
    this.cdr.markForCheck()
  }

  openTicketDetail(ticketId: string): void {
    queueMicrotask(() => {
      const scope = this.activeTab() === 0 ? 'User' : 'Support'
      this.detailContext.setInnerScope(scope)
      this.detailContext.setTicketId(ticketId)
      this.overlayContext.open('TicketDetail')
    })
  }

  newTicket(): void {
    queueMicrotask(() => {
      this.detailContext.setInnerScope(this.activeTab() === 0 ? 'User' : 'Support')
      this.overlayContext.open('NewTicket')
    })
  }

  onCloseFromCard(ticketId: string): void {
    this.clsSub = of(null).pipe(
      switchMap(() =>
        this.activeTab() === 0 || !this.handleTickets()
          ? this.helpService.closeMyTicket(ticketId)
          : this.helpService.closeTicketAsSupport(ticketId)
      )
    ).subscribe({
      next: ok => {
        if (!ok) return

        this.items = this.items.map(t =>
          t.id === ticketId
            ? { ...t, status: 'Closed' as const }
            : t
        )

        this.cdr.markForCheck()
      }
    })
  }

  onReopenFromCard(ticketId: string): void {
    if (this.activeTab() !== 1 || !this.handleTickets()) return

    this.ropSub = this.helpService.reopenTicketAsSupport(ticketId).subscribe({
      next: ok => {
        if (!ok) return

        this.items = this.items.map(t =>
          t.id === ticketId
            ? { ...t, status: 'Open' as const }
            : t
        )

        this.cdr.markForCheck()
      }
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
