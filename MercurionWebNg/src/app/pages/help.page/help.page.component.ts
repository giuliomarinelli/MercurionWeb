import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { Observable, of, Subscription, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Ticket } from '../../Models/graphql/help.models';
import { AbstractPaginationComponent } from '../../abstract/abstract-pagination-component'
import { PageModel } from '../../Models/graphql/page.models';
import { HelpService } from '../../services/graphql/help.service';
import { TypeGuardsService } from '../../services/type-guards.service';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { TabsComponent } from '../../components/common/tabs/tabs.component';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'm-help-page',
  imports: [
    ClassicSpinnerComponent,
    TabsComponent,
    JsonPipe
  ],
  template: `


    <section class="main-container">
        @if (handleTickets()) {
          <m-tabs [tabs]="tabs" (tabChange)="switchTab($event)" [activeIndex]="activeTab()" />
        }
        <div class="mt-px relative -top-8">
        @for (item of items; track item.id; let i = $index) {
          <!-- TODO: card/tile -->
          <div class="my-24">
            {{item | json }}
          </div>
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
              <!-- TODO: skeleton loader -->
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
export class HelpPageComponent extends AbstractPaginationComponent<Ticket | Omit<Ticket, 'updatedAt'>> implements OnInit, OnDestroy, AfterViewInit {

  private readonly authService = inject(AuthService)
  private readonly helpService = inject(HelpService)
  private readonly typeGuards = inject(TypeGuardsService)

  @ViewChild('sentinel')
  protected declare sentinel: ElementRef<HTMLDivElement>

  protected readonly tabs = ['Sezione utente', 'Sezione admin']
  private readonly ITEMS_PER_PAGE = 10

  private userFetchSub?: Subscription
  private supFetchSub?: Subscription

  handleTickets = signal<boolean>(false)
  activeTab = signal<0 | 1>(0)

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
    const handleTickets = (this.authService.getCachedScopes() ?? this.authService.getUserScopesFromClaims()).includes('HandleTickets')
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

  protected override fetch$(): Observable<PageModel<Ticket | Omit<Ticket, 'updatedAt'>>> {
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
      })
    )
  }

  protected override doQuery(q: string): void {
    // Al momento niente barra di ricerca
  }

  protected override doClear(): void {
    // Al momento niente barra di ricerca
  }


}
