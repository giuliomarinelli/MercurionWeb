import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { ActivatedRoute, Router } from '@angular/router';
import { HelpService } from '../../services/graphql/help.service';
import { combineLatest, EMPTY, of, Subscription, switchMap } from 'rxjs';
import { isStrictGoScope } from '../../Models/go.scope.models';
import { GqlV2Error } from '../../services/graphql/graphql-helpers/v2/gql-v2.error';
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service';
import { TicketDetailContextService } from '../../services/context/action-context/ticket-detail-context.service';

@Component({
  selector: 'm-go-page',
  imports: [ClassicSpinnerComponent],
  template: `

    <section class="main-container h-full flex justify-center items-center">
      <m-classic-spinner [size]="60" />
    </section>

  `
})
export class GoPageComponent implements OnInit, OnDestroy {

  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  private readonly helpService = inject(HelpService)
  private readonly actionContext = inject(ActionOverlayContextService)
  private readonly ticketDetailContext = inject(TicketDetailContextService)

  private key = signal<string>('')

  private sub?: Subscription

  ngOnInit(): void {
    this.sub = of(null).pipe(
      switchMap(() => this.route.queryParamMap),
      switchMap((p) => {
        const s = p.get('s') ?? ''
        const k = p.get('k') ?? ''
        if (!s || !k) {
          this.router.navigateByUrl('/404-not-found')
          return EMPTY
        }
        if (isStrictGoScope(s)) {
          switch (s) {
            case 'TicketDetail':
              return combineLatest([of(s), of(k)])
            default:
              this.router.navigateByUrl('/404-not-found')
              return EMPTY
          }
        } else {
          this.router.navigateByUrl('/404-not-found')
          return EMPTY
        }
      }),
      switchMap(([s, k]) => {
        switch (s) {
          case 'TicketDetail':
            this.key.set(k)
            return this.helpService.existsUserTicketById(k)
          default:
            this.router.navigateByUrl('/404-not-found')
            return EMPTY
        }
      })
    ).subscribe({
      next: (exists) => {
        // TODO: per successive implementazioni va distinta la casistica di scope anche qui
        if (!exists || !this.key()) {
          this.router.navigateByUrl('/404-not-found')
          return
        }

        const ticketId = this.key()
        this.router.navigateByUrl('/help').then(() => {
          queueMicrotask(() => {
            this.ticketDetailContext.setInnerScope('User')
            this.ticketDetailContext.setTicketId(ticketId)
            this.actionContext.open('TicketDetail')
          })
        })
      },
      error: (e) => {
        if (e instanceof GqlV2Error && e.kind === 'GraphQL') {
          const message = e.gqlErrors[0]?.message
          const code = e.gqlErrors[0]?.extensions?.code
          if (message === 'Unauthenticated' && code === 'UNAUTHENTICATED') {
            sessionStorage.setItem('redirectAfterLogin', this.router.url)
            return
          } else {
            this.router.navigateByUrl('/404-not-found')
            return
          }
        }
        this.router.navigateByUrl('/404-not-found')
      }
    })
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  }

}
