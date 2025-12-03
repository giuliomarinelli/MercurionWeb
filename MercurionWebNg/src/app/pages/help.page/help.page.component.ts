import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { Observable, of, Subscription, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ClientTicket, Ticket } from '../../Models/graphql/help.models';
import { AbstractPaginationComponent } from '../../abstract/abstract-pagination-component'
import { PageModel } from '../../Models/graphql/page.models';
import { HelpService } from '../../services/graphql/help.service';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { TabsComponent } from '../../components/common/tabs/tabs.component';
import { TicketCardComponent } from '../../components/support/ticket-card/ticket-card.component';
import { TypeGuardsService } from '../../services/type-guards.service';
import { TicketCardSkeletonComponent } from '../../components/support/ticket-card-skeleton/ticket-card-skeleton.component';
import { TicketDetailContextService } from '../../services/context/action-context/ticket-detail-context.service';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';

@Component({
  selector: 'm-help-page',
  imports: [
    ClassicSpinnerComponent,
    TabsComponent,
    TicketCardComponent,
    TicketCardSkeletonComponent
  ],
  template: `


    <section class="main-container">
      <h1 class="mt-4 xs:mt-0 relative bottom-4 text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary border-b border-slate-300 dark:border-slate-700 pb-6">
        <a class="hover:underline" routerLink="/molecules/all-my-molecules">Supporto</a>
      </h1>
      @if (handleTickets()) {
        <m-tabs [tabs]="tabs" (tabChange)="switchTab($event)" [activeIndex]="activeTab()" />
      }
      <button
        type="button"
        class="relative bottom-[10px] w-fit mx-auto sm:mx-0 mt-1 py-2.5 px-8 text-white rounded-md transition-colors duration-150 bg-light-accent-primary dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80 flex justify-center items-center gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-7">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path d="M145.5 460.9L152.6 443.4L140.7 428.7C112.5 393.8 96 350.6 96 304C96 191 194.3 96 320 96C445.7 96 544 191 544 304C544 417 445.7 512 320 512C287.4 512 256.6 505.6 228.8 494L217.6 489.4L206.1 493.3L120.2 522.8L145.4 460.8zM64 576C78.8 570.9 129.6 553.4 216.5 523.6C248.1 536.7 283.2 544 320 544C461.4 544 576 436.5 576 304C576 171.5 461.4 64 320 64C178.6 64 64 171.5 64 304C64 358.4 83.3 408.6 115.8 448.8C88.7 515.5 71.4 557.9 64 576zM320 224C340.6 224 357.2 240.7 357.2 261.2C357.2 276.9 348.8 285.7 338.7 291.3C328.1 297.3 317.7 298.6 306.1 300L304 300.3L304 352L336 352L336 327.1C341.3 325.4 347.8 323 354.5 319.2C371 309.9 389.3 292.1 389.3 261.2C389.3 223 358.3 192 320.1 192C281.9 192 250.9 223 250.9 261.2L282.9 261.2C282.9 240.6 299.6 224 320.1 224zM300 420L340 420L340 380L300 380L300 420z"/>
        </svg>
        <span>
          Apri un nuovo ticket di suporto
        </span>
      </button>
      <p class="my-4 font-medium">
        @if (handleTickets() && activeTab() === 1) {
          Gli utenti hanno creato complessivamente&nbsp;<strong class="text-light-accent-primary dark:text-dark-accent-primary">{{totalItems()}}</strong>&nbsp;ticket.
        } @else {
          Ci sono un totale di&nbsp;<strong class="text-light-accent-primary dark:text-dark-accent-primary">{{totalItems()}}</strong>&nbsp;ticket.
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
            (onOpenDetail)="openTicketDetail($event)"  />
      }
      </div>

      <!-- Sentinel con altezza > 0 -->
      <div #sentinel class="h-px w-full"></div>

      @if (loading) {
        @if (page > 1 && items.length > 2) {
          <div class="flex justify-center">
            <app-classic-spinner [size]="60" />
          </div>
        } @else {
          <div class="relative -top-20">
            @for (i of [0, 1, 2, 3, 4]; track i) {
              <m-ticket-card-skeleton [i]="i" />
            }
          </div>
        }
      } @else if (empty() && (earlyDone)) {
        <p class="relative -top-8 text-slate-700 dark:text-slate-200">
          Non sono ancora presenti ticket.&nbsp;<button class="a">Apri adesso il tuo primo ticket</button>.
        </p>
      }
    </section>

    `
})
export class HelpPageComponent extends AbstractPaginationComponent<Ticket | ClientTicket> implements OnInit, OnDestroy, AfterViewInit {

  private readonly authService = inject(AuthService)
  private readonly helpService = inject(HelpService)
  protected readonly typeGuards = inject(TypeGuardsService)
  private readonly detailContext = inject(TicketDetailContextService)
  private readonly overlayContext = inject(ActionOverlayContextService)

  @ViewChild('sentinel')
  protected declare sentinel: ElementRef<HTMLDivElement>

  protected readonly tabs = ['Sezione utente', 'Sezione admin']
  private readonly ITEMS_PER_PAGE = 10

  private userFetchSub?: Subscription
  private supFetchSub?: Subscription

  handleTickets = signal<boolean>(false)
  activeTab = signal<0 | 1>(0)
  totalItems = signal<number>(0)

  switchTab(i: number): void {
    if (i < 0 || i > 1) {
      return
    }
    if (i === 1 && !this.handleTickets()) {
      return
    }
    queueMicrotask(() => {
      this.activeTab.set(i as (0 | 1))
      this.resetPagination()
    })
  }

  ngOnInit(): void {
    const handleTickets = (this.authService.getCachedScopes() ?? this.authService.getUserScopesFromClaims(null, true)).includes('HandleTickets')
    this.handleTickets.set(handleTickets)
    queueMicrotask(() => this.loadMore())
  }

  ngOnDestroy(): void {
    this.userFetchSub?.unsubscribe()
    this.supFetchSub?.unsubscribe()
    this.observer?.disconnect()
  }

  ngAfterViewInit(): void {
    this.startObserver()
  }

  protected override fetch$(): Observable<PageModel<Ticket | ClientTicket>> {
    return of(null).pipe(
      switchMap(() => {
        if (this.activeTab() === 1) {
          if (this.handleTickets()) {
            return this.helpService.ticketsAsSupport(this.page, this.ITEMS_PER_PAGE)
          } else {
            queueMicrotask(() => this.activeTab.set(0))
          }
        }
        return this.helpService.myTickets(this.page, this.ITEMS_PER_PAGE)
      }),
      tap((res) => {
        this.totalItems.set(res.totalItems)
      })
    )
  }

  protected override doQuery(q: string): void {
    // Al momento niente barra di ricerca
  }

  protected override doClear(): void {
    // Al momento niente barra di ricerca
  }

  openTicketDetail(ticketId: string): void {
    queueMicrotask(() => {
      this.detailContext.setTicketId(ticketId)
      this.detailContext.setInnerScope(this.activeTab() === 0 ? 'User' : 'Support')
      this.overlayContext.open('TicketDetail')
    })
  }


}
